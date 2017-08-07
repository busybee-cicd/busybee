#!/usr/bin/env node

const _async = require('async');
const _ = require('lodash');
const parseFiles = require('./lib/parseFiles');
const RESTManager = require('./lib/restManager');
const EnvManager = require('./lib/envManager');
const TestManager = require('./lib/testManager');
const MockServer = require('./lib/mockServer');
const Logger = require('./lib/logger');
const fs = require('fs');
const path = require('path');
let mockServer;
let logger;
let Commander = require('commander');

Commander
  .version('0.1.0')

Commander
  .command('test')
  .description('execute tests')
  .option('-d, --directory <directory>', 'Test Directory. defaults to feeny/')
  .option('-c, --config <config>', 'Config File. defaults to config.json. parsed as being relative to --directory')
  .option('-D, --debug', 'debug mode')
  .option('-h, --host <host>', 'config.apiServer host')
  .option('-s, --skipEnvProvisioning', 'Will skip provisioning of environments for each Test Set. Assumes envs are already running')
  .option('-sts, --skipTestSuite', 'list of comma-separated TestSuite ids to skip')
  .option('-o, --onCompleteScript <onCompleteScript>', 'The filename of javascript module placed in your feeny/ directory. Will be called on complete. ex module) module.exports = (err, results) => { console.log(err || JSON.stringify(results)); }')
  .action((options) => {
    const conf = parseConfiguration(options, 'test');
    logger = new Logger(conf);
    initTests(conf);
  });

Commander
  .command('mock')
  .description('runs a mock REST API server using your tests as mocks')
  .option('-d, --directory <directory>', 'Test Directory. defaults to feeny/')
  .option('-D, --debug', 'debug mode')
  .option('-c, --config <config>', 'Config File. defaults to config.json. parsed as being relative to --directory')
  .option('-t, --testSuite <id>', 'Required. The ID of the REST Api TestSuite that you would like to run a mock server for')
  .action((options) => {
    const conf = parseConfiguration(options, 'mock');
    logger = new Logger(conf);
    if (!options.testSuite) {
      logger.error(`'--testSuite' is a required argument, exiting`);
      return;
    }

    // identify the TestSuite.
    let testSuite = _.find(conf.testSuites, (suite) => { return suite.id == options.testSuite; });
    if (!testSuite) {
      logger.error(`No TestSuite with the id ${options.testSuite} could be identified, exiting`);
      return
    }

    let mockServer = new MockServer(testSuite, {debug: conf.debug});
  });

  Commander
    .command('init')
    .description('set up feeny folder and example config/test')
    .action(() => {
      const exampleConf = require('./example/config.json');
      const exampleTest = require('./example/test.json');
      const feenyDir = path.join(process.cwd(), 'feeny');
      if (!fs.existsSync(feenyDir))
        fs.mkdirSync(feenyDir);
      if (!fs.exists(path.join(feenyDir, 'test.json')))
        fs.writeFileSync(path.join(feenyDir, 'test.json'), JSON.stringify(exampleTest, null, '\t'));
      if (!fs.exists(path.join(feenyDir, 'config.json')))
        fs.writeFileSync(path.join(feenyDir, 'config.json'), JSON.stringify(exampleConf, null, '\t'));

      console.log("Feeny initialized!");
    });

Commander.parse(process.argv);

function parseConfiguration(cmdOpts, mode) {
  const DEBUG = process.env.DEBUG || cmdOpts.debug;

  // 1. parse config and merge in any useful command line args
  let parsedConf = parseFiles.parse(cmdOpts, mode, DEBUG);
  if (!parsedConf) {
    throw new Exception("No config.json found");
  }

  return Object.assign({}, parsedConf, {
    cmdOpts: cmdOpts
  });
}


function initTests(conf) {
  // 2. instantiate EnvManager and ApiManager. handle shutdown signals
  let envManager = new EnvManager(conf);
  let testManager = new TestManager(conf, envManager);

  function shutdown(err) {
    if (err)
      console.log(err);

    envManager.stopAll()
      .then(() => {
        process.exit(0)
      })
      .catch((err) => {
        console.log(err);
        process.exit(1);
      });
  }

  process.on('uncaughtException', (err) => {
    shutdown(err);
  });

  process.on('SIGHUP', (err) => {
    shutdown(err);
  });

  process.on('SIGINT', (err) => {
    shutdown(err);
  });

  testManager.buildTestSuiteTasks();
  //testManager.buildTestEnvTasks();

  // spin up testSetTasks in parallel and then run tests
  let parallelism = 1;
  if (conf.env && conf.env.parallelism)
    parallelism = conf.env.parallelism

  // run the api tests
  // TODO: allow ordering of TestSuites and TestEnvs
  let envTasks = [];
  _.forEach(testManager.testSuiteTasks, (suiteTask) => {
    suiteTask.envTasks.forEach((envTask) => {
      envTasks.push(envTask);
    });
  });

  _async.parallelLimit(envTasks, parallelism, (err, results) => {
    if (conf.onCompleteScript || conf.cmdOpts.onCompleteScript) {
      let scriptPath = conf.onCompleteScript ?
        path.join(conf.filePaths.feenyDir, conf.onCompleteScript)
        : path.join(conf.filePaths.feenyDir, conf.cmdOpts.onCompleteScript);

      try {
        logger.debug(`Running onCompleteScript: ${scriptPath}`);
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
