#!/usr/bin/env node

import {BusybeeParsedConfig} from './models/config/BusybeeParsedConfig';
require('source-map-support').install();
import * as _async from 'async';
import * as _ from 'lodash';
import * as Commander from 'commander';
import * as fs from 'fs';
import * as path from 'path';
const appVersion = require('../../package.json').version;
import {ConfigParser} from  './lib/ConfigParser';
import {EnvManager} from './managers/EnvManager';
import {TestManager} from './managers/TestManager';
import {MockServer} from './lib/MockServer';
import {Logger} from './lib/Logger';
import {EnvResult} from './models/results/EnvResult';
import {TestSuiteResult} from './models/results/TestSuiteResult';
let logger;
//process.env.UV_THREADPOOL_SIZE = '128';

Commander
  .version(appVersion);

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
  .option('-k, --skipTestSuite <ids>', 'list of comma-separated TestSuite ids to skip')
  .option('-t, --testFiles <filenames>', 'list of comma-separated test files to run. ie) test.json,test2.json,users/mytest.json')
  .option('-e, --envInstances <ids>', 'list of comma-separated envInstance ids to run')
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
  .option('-n, --noProxy, Will ignore any userConfigFile.json proxy configuration and skip proxy attempts')
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
    let testSuite = _.find(conf.parsedTestSuites.values(), (suite) => {
      return suite.suiteID == options.testSuite;
    });
    if (!testSuite) {
      logger.error(`No TestSuite with the id ${options.testSuite} could be identified, exiting`);
      return
    }

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
  let envTasks: any[] = [];
  _.forEach(testManager.testSuiteTasks, (suiteTask) => {
    suiteTask.envTasks.forEach((envTask) => {
      envTasks.push(envTask);
    });
  });

  _async.parallel(envTasks, (err, envResults: Array<EnvResult>) => {
    // group the result sets by their Suite
    let suiteResults = {};

    envResults.forEach((envResult: EnvResult) => {
      // todo use TestSuiteResult model instead of any
      if (!suiteResults[envResult.suiteID]) {
        let sr = new TestSuiteResult();
        sr.testSets = envResult.testSets;
        sr.pass = true;
        sr.type = envResult.type;
        sr.id = envResult.suiteID;
        suiteResults[envResult.suiteID] = sr;
      } else {
        suiteResults[envResult.suiteID].testSets = suiteResults[envResult.suiteID].testSets.concat(envResult.testSets);
      }

      // mark the suite as failed if it contains atleast 1 env w/ a failure
      if (_.find(envResult.testSets, ts => {
          return !ts.pass;
        })) {
        suiteResults[envResult.suiteID].pass = false;
      }
      ;
    });

    // for easier parsing lets return each suite as its own object in a list
    let suiteResultsList = [..._.values(suiteResults)];

    if (conf.reporters && !_.isEmpty(conf.reporters)) {
      logger.info('Running Reporters');
      conf.reporters.forEach(r => {
        try {
          if (conf.localMode) {
            if (!_.isUndefined(r.skipInLocalMode) && r.skipInLocalMode) {
              return;
            }
          }

          r.run(suiteResultsList)
        } catch (e) {
          logger.error('Error encountered while running reporter');
          logger.error(e);
        }
      });
    }

    if (conf.onComplete) {
      let scriptPath = conf.onComplete = path.join(conf.filePaths.busybeeDir, conf.onComplete);

      try {
        logger.info(`Running onComplete: ${scriptPath}`);
        require(scriptPath)(err, suiteResultsList);
      } catch (e) {
        console.log(e);
      }
    } else {
      logger.trace(err || suiteResultsList);
      logger.info('Complete');
    }
  });

  // run the ui tests
}
