#!/usr/bin/env node

const _async = require('async');
const _ = require('lodash');
const parseFiles = require('./lib/parseFiles');
const RESTManager = require('./lib/restManager');
const EnvManager = require('./lib/envManager');
const TestManager = require('./lib/testManager');
const MockServer = require('./lib/mockServer');
let mockServer;
let Commander = require('commander');

Commander
  .version('0.1.0')

Commander
  .command('test')
  .description('execute tests')
  .option('-d, --directory <directory>', 'Test Directory. defaults to feeny/')
  .option('-c, --config <config>', 'Config File. defaults to config.json. parsed as being relative to --directory')
  .option('-D, --debug', 'debug mode')
  .option('-s, --skipEnvProvisioning', 'Will skip provisioning of environments for each Test Set. Assumes envs are already running')
  .action((options) => {
    const conf = parseConfiguration(options);
    initTests(conf);
  });

Commander
  .command('mock')
  .description('runs a mock REST API server using your tests as mocks')
  .option('-d, --directory <directory>', 'Test Directory. defaults to feeny/')
  .option('-c, --config <config>', 'Config File. defaults to config.json. parsed as being relative to --directory')
  .action((options) => {
    const conf = parseConfiguration(options);
    let mockServer = new MockServer(conf);
  });

Commander.parse(process.argv);

function parseConfiguration(cmdOpts) {
  const DEBUG = process.env.DEBUG || cmdOpts.debug;

  // 1. parse config and merge in any useful command line args
  let parsedConf = parseFiles.parse(cmdOpts, DEBUG);
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

  _async.parallelLimit(testManager.testSetTasks, parallelism, (err, results) => {
    console.log(err || JSON.stringify(results, null, '\t'));
  });
}
