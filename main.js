#!/usr/bin/env node

const async = require('async');
const { exec } = require('child_process');
const request = require('request');
const _ = require('lodash');
const parseFiles = require('./lib/parseFiles');
const DEBUG = process.env.DEBUG;
const uuidv1 = require('uuid/v1');
let program = require('commander');

program
  .version('0.1.0')
  .option('-d, --directory <directory>', 'Test Directory. defaults to api-tests/')
  .option('-c, --config <config>', 'Config File. defaults to config.json')
  .parse(process.argv);

// parse json
const conf = parseFiles.parse(program);
if (!conf) {
  throw new Exception("No config.json found");
}

// setup default request
const apiRequest = request.defaults(conf.defaultRequestOpts || {});

// build and env per test set while keeping track of parallelism
let parallelismCount = 1;
let currentPort = conf["apiPort"];
let testSets = [];
_.forEach(conf["testSets"], (set, id) => {
  if (parallelismCount > conf.env.parallelism) {
    // reset port and parallelismCount
    parallelismCount = 1;
    currentPort = conf["apiPort"];
  }

  testSets.push(buildEnv(currentPort, set));

  parallelismCount = 1 + parallelismCount;
  if (conf.env.singleServer) {
    // if we're running all our envs on the same server we should increment the
    // env port to avoid collision
    currentPort += 1;
  }
});

function buildBaseUrl(port) {
  let url = conf.apiHost;
  if (port)
    url += `:${port}`;
  if (conf.apiRoot)
    url += conf.apiRoot;

  return url;
}

function buildTestUrl(test, port) {
  let url = buildBaseUrl(port);
  if (test.request.endpoint)
    url += test.request.endpoint

  return url;
}

function confirmHealthcheck(port, envId, cb) {
  if (!conf.healthcheck) {
    cb(true);
  }

  let url = buildBaseUrl(port);
  let opts = {
    url: `${url}${conf.healthcheck.endpoint}`
  };

  if (conf.healthcheck.query)
    opts = Object.assign({}, opts, {qs: conf.healthcheck.query});

  // retries the healthcheck endpoint every 3 seconds up to 20 times
  // when successful calls the cb passed to confirmHealthcheck()
  if (DEBUG) {
    console.log("Healthcheck request Opts:");
    console.log(opts);
  }

  async.retry({times: 20, interval: 5000},
    (asyncCb) => {
      console.log(`Attempting healthcheck for stack-${envId}...`);
      apiRequest(opts, (err, res, body) => {
        if (err) {
          asyncCb("failed");
          return
        }

        if (res && res.statusCode === 200) {
          asyncCb(null, true);
        } else {
          asyncCb("failed");
        }
      })
    }
    , cb);
}

function buildEnv(port, testSet) {
  return (cb) => {
    let envId = uuidv1();
    // run the env setup file and pass args
    let envScript = exec(`sh ${process.cwd()}/${conf.envStartScript} ${port} ${envId}`);
    envScript.stdout.on('data', (data) => {
      // data should prob return the id of the env for later
      let res = data.trim();
      if (res == "ready") {
        //confirm that the server is returning
        confirmHealthcheck(port, envId, (err, results) => {
          if (err) {
            // attempt shutdown and throw exception
            exec(`sh ${process.cwd()}/${conf.envStopScript} ${envId}`);
            cb("Failed to confirm healthcheck!");
            return;
          }

          // build api test functions
          let testFns = buildTestTasks(testSet, port);

          // run api test functions
          console.log(`Running Test Set: ${testSet.id}`);
          if (testSet.description) {
            console.log(`${testSet.description}`);
          }
          let flow = conf["controlFlow"] || "parallel";
          async[flow](testFns, (err2, testResults) => {
            // pass test results
            let testSetResults = {
              name: testSet.id,
              results: testResults
            };

            exec(`sh ${process.cwd()}/${conf.envStopScript} ${envId}`);
            cb(err2, testSetResults);
          });
        });
      }
    });

    envScript.stderr.on('data', (data) => {
      // something didn't work
      cb(data);
    });
  };
}

function buildTestTasks(testSet, port) {
  if (!testSet.tests) {
    console.log(`testSet ${testSet.name} has no tests`);
    return [];
  }

  return testSet.tests.map((test, i) => {
    return (cb) => {
      if (!test.request) {
        console.log(`testSet ${testSet.name}:${0} contains no request information`);
        cb(null);
      }

      // build request
      let opts = {
        url: buildTestUrl(test, port),
        method: test.request.method
      };

      // allow users to specify request opts per call
      if (test.request.requestOpts)
        opts = Object.assign({}, opts, test.request.requestOpts);

      if (test.request.body)
        opts = Object.assign({}, opts, {body: test.request.body});

      if (test.request.query)
        opts = Object.assign({}, opts, {qs: test.request.query});

      // make request
      if (DEBUG)
        console.log(opts);

      let consoleText;
      if (_.isUndefined(test.testIndex)) {
        consoleText = `${testSet.id}: #: ${test.name}`;
      } else {
        consoleText = `${testSet.id}: ${test.testIndex}: ${test.name}`
      }
      console.log(consoleText)
      apiRequest(opts, (err, res, body) => {
        if (err)
          cb(err);

        // validate results
        let testResult = {name: test.name, index: test.testIndex};

        if (test.expect.status) {
          testResult.status = res.statusCode == test.expect.status
            ? true
            : `Expected ${test.expect.status} was ${res.statusCode}`
        }

        if (test.expect.body) {
          testResult.body = _.isEqual(body, test.expect.body)
            ? true
            : `Expected ${JSON.stringify(test.expect.body)} was ${JSON.stringify(body)}`
        }

        cb(null, testResult);
      });
    };
  });
}


// spin up testSets in parallel and then run tests
let parallelism = 1;
if (conf.env && conf.env.parallelism)
  parallelism = conf.env.parallelism

async.parallelLimit(testSets, parallelism, (err, results) => {
  console.log("RESULTS")
  console.log(err || JSON.stringify(results, null, '\t'));
});
