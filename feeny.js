#!/usr/bin/env node

const _async = require('async');
const _ = require('lodash');
const parseFiles = require('./lib/parseFiles');
const RESTManager = require('./lib/restManager');
const EnvManager = require('./lib/envManager');
const TestManager = require('./lib/testManager');
const MockServer = require('./lib/mockServer');
let mockServer;
let program = require('commander');

program
  .version('0.1.0')
  .option('-d, --directory <directory>', 'Test Directory. defaults to integration-tests/')
  .option('-c, --config <config>', 'Config File. defaults to config.json. parsed as being relative to --directory')
  .option('-D, --debug', 'debug mode')
  .option('-s, --skipEnvProvisioning', 'Will skip provisioning of environments for each Test Set. Assumes envs are already running')
  .option('-m, --mockServer', 'Run the mock server')
  .parse(process.argv);

const DEBUG = process.env.DEBUG || program.debug;

// 1. parse config and merge in any useful command line args
let parsedConf = parseFiles.parse(program);
if (!parsedConf) {
  throw new Exception("No config.json found");
}

const conf = Object.assign({}, parsedConf, {
  cmdOpts: program,
  debug: DEBUG
});

if (conf.cmdOpts.mockServer) {
  mockServer = new MockServer(conf);
};

// 2. instantiate EnvManager and ApiManager. handle shutdown signals
let restManager = new RESTManager(conf);
let envManager = new EnvManager(conf, restManager);
let testManager = new TestManager(conf, envManager, restManager);

async function shutdown(err) {
  if (err)
    console.log(err);

  //envManager.stopAll().then(() => process.exit(0));
  try {
    await envManager.stopAll();
  } catch (e) {
    console.log(e);
  }

  process.exit(0);
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

return
testManager.buildTestSetTasks();

// spin up testSetTasks in parallel and then run tests
let parallelism = 1;
if (conf.env && conf.env.parallelism)
  parallelism = conf.env.parallelism

_async.parallelLimit(testManager.testSetTasks, parallelism, (err, results) => {
  console.log(err || JSON.stringify(results, null, '\t'));
});
