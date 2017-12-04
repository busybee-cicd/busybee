#!/usr/bin/env node
import {BusybeeParsedConfig} from "./config/BusybeeParsedConfig";
require('source-map-support').install();
import * as _async from 'async';
import * as _ from 'lodash';
import * as Commander from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import {ConfigParser} from  './lib/ConfigParser';
import {EnvManager} from './managers/EnvManager';
import {TestManager} from './managers/TestManager';
import {MockServer} from './lib/MockServer';
import {Logger} from './lib/Logger';
let logger;


Commander
  .version('0.1.0');

// TODO: REMOVE protocol and host from cmdOpts...need to be per test suite
Commander
  .command('test')
  .description('execute tests')
  .option('-c, --userConfigFile <userConfigFile>', 'Config File. defaults to userConfigFile.json. parsed as being relative to --directory')
  .option('-d, --directory <directory>', 'Test Directory. defaults to busybee/')
  .option('-D, --debug', 'convenience flag for debug mode')
  .option('-l, --localMode', 'ignores any host configuration in favor of localhost with a capacity of 100')
  .option('-L, --logLevel <level>', '[DEBUG, INFO, WARN, ERROR]')
  .option('-o, --onComplete <onComplete>', 'The filename of javascript module placed in your busybee/ directory. Will be called on complete. ex module) module.exports = (err, results) => { console.log(err || JSON.stringify(results)); }')
  .option('-s, --skipEnvProvisioning <ids>', 'list of comma-separated TestSuite ids. Environments will not be provisioned for these TestSuites prior to running tests')
  .option('-ss, --skipTestSuite <ids>', 'list of comma-separated TestSuite ids to skip')
  .option('-t, --testFiles <filenames>', 'list of comma-separated test files to run. ie) test.json,test2.json,users/mytest.json')
  .action((options) => {
    let configParser = new ConfigParser(options);
    const conf: BusybeeParsedConfig = configParser.parse('test');
    logger = new Logger(conf, this);
    initTests(conf);
  });

Commander
  .command('mock')
  .description('runs a mockResponse REST API server using your tests as mocks')
  .option('-c, --userConfigFile <userConfigFile>', 'Config File. defaults to userConfigFile.json. parsed as being relative to --directory')
  .option('-d, --directory <directory>', 'Test Directory. defaults to busybee/')
  .option('-D, --debug', 'convenience flag for debug mode')
  .option('-L, --logLevel <level>', '[DEBUG, INFO, WARN, ERROR]')
  .option('-l, --localMode', 'ignores any host configuration in favor of localhost with a capacity of 100')
  .option('-np, --noProxy, Will ignore any userConfigFile.json proxy configuration and skip proxy attempts')
  .option('-t, --testSuite <id>', 'Required. The ID of the REST Api TestSuite that you would like to run a mock server for')
  .action((options) => {
    if (!options.testSuite) {
      console.log(`'--testSuite' is a required argument, exiting`);
      return;
    }
    let configParser = new ConfigParser(options);
    const conf: BusybeeParsedConfig = configParser.parse('mock');
    logger = new Logger(conf, this);


    // identify the TestSuite.
    let testSuite = _.find(conf.parsedTestSuites.values(), (suite) => { return suite.suiteID == options.testSuite; });
    if (!testSuite) {
      logger.error(`No TestSuite with the id ${options.testSuite} could be identified, exiting`);
      return
    }

    testSuite.cmdOpts = options;
    new MockServer(testSuite, conf);
  });

  Commander
    .command('init')
    .description('set up busybee folder and example userConfigFile/test')
    .action(() => {
      const exampleConf = require('./init/userConfigFile.json');
      const exampleTest = require('./init/test.json');
      const busybeeDir = path.join(process.cwd(), 'busybee');
      if (!fs.existsSync(busybeeDir))
        fs.mkdirSync(busybeeDir);
      if (!fs.exists(path.join(busybeeDir, 'test.json'), null))
        fs.writeFileSync(path.join(busybeeDir, 'test.json'), JSON.stringify(exampleTest, null, '\t'));
      if (!fs.exists(path.join(busybeeDir, 'userConfigFile.json'), null))
        fs.writeFileSync(path.join(busybeeDir, 'userConfigFile.json'), JSON.stringify(exampleConf, null, '\t'));

      console.log("Busybee initialized!");
    });

Commander.parse(process.argv);


function initTests(conf: BusybeeParsedConfig) {
  // 2. instantiate EnvManager and ApiManager. handle shutdown signals
  let envManager = new EnvManager(conf);
  let testManager = new TestManager(conf, envManager);

  async function shutdown(err) {
    if (err)
      console.log(err);

    try {
      await envManager.stopAll();
      process.exit(0);
    } catch (e) {
        console.log(err);
        process.exit(1);
    }
  }


  process.on('uncaughtException', (err: Error) => {
    shutdown(err);
  });

  process.on('SIGHUP', () => {
    shutdown(null);
  });

  process.on('SIGINT', () => {
    shutdown(null);
  });

  testManager.buildTestSuiteTasks();

  // run the api tests
  // TODO: allow ordering of TestSuites and TestEnvs
  let envTasks = [];
  _.forEach(testManager.testSuiteTasks, (suiteTask) => {
    suiteTask.envTasks.forEach((envTask) => {
      envTasks.push(envTask);
    });
  });

  _async.parallel(envTasks, (err, results) => {
    if (conf.onComplete || conf.cmdOpts.onComplete) {
      let scriptPath = conf.onComplete ?
        path.join(conf.filePaths.busybeeDir, conf.onComplete)
        : path.join(conf.filePaths.busybeeDir, conf.cmdOpts.onComplete);

      try {
        logger.debug(`Running onComplete: ${scriptPath}`);
        require(scriptPath)(err, results);
      } catch (e) {
        console.log(e);
      }
    } else {
      console.log(err || JSON.stringify(results, null, '\t'));
    }
  });

  // run the ui tests
}
