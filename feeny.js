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
  .action((options) => {
    const conf = parseConfiguration(options, 'mock');
    logger = new Logger(conf);
    let mockServer = new MockServer(conf);
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
    cmdOpts: cmdOpts,
    debug: DEBUG
  });
}


function initTests(conf) {
  // 2. instantiate EnvManager and ApiManager. handle shutdown signals
  let restManager = new RESTManager(conf);
  let envManager = new EnvManager(conf, restManager);
  let testManager = new TestManager(conf, envManager, restManager);

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

  testManager.buildTestSetTasks();

  // spin up testSetTasks in parallel and then run tests
  let parallelism = 1;
  if (conf.env && conf.env.parallelism)
    parallelism = conf.env.parallelism

  // run the api tests
  _async.parallelLimit(testManager.restApiTestSetTask, parallelism, (err, results) => {
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
