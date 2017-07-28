#!/usr/bin/env node

const _async = require('async');
const _ = require('lodash');
const parseFiles = require('./lib/parseFiles');
const ApiManager = require('./lib/apiManager');
const EnvManager = require('./lib/envManager');
const TestManager = require('./lib/testManager');
let program = require('commander');

program
  .version('0.1.0')
  .option('-d, --directory <directory>', 'Test Directory. defaults to integration-tests/')
  .option('-c, --config <config>', 'Config File. defaults to config.json. parsed as being relative to --directory')
  .option('-D, --debug', 'debug mode')
  .option('-s, --skip-env-provisioning', 'Will skip provisioning of environments for each Test Set. Assumes envs are already running')
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

// 2. instantiate EnvManager and ApiManager. handle shutdown signals
let envManager = new EnvManager(conf);
let apiManager = new ApiManager(conf);
let testManager = new TestManager(conf, envManager, apiManager);

async function shutdown(err) {
  if (err)
    console.log(err);

  //envManager.stopAll().then(() => process.exit(0));
  await envManager.stopAll();
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


testManager.buildApiTestSetTasks();

// spin up testSetTasks in parallel and then run tests
let parallelism = 1;
if (conf.env && conf.env.parallelism)
  parallelism = conf.env.parallelism

_async.parallelLimit(testManager.testSetTasks, parallelism, (err, results) => {
  console.log(err || JSON.stringify(results, null, '\t'));
});
