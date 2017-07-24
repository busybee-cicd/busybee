const async = require('async');
const { exec } = require('child_process');
const request = require('request');
const _ = require('lodash');
const parseFiles = require('./parseFiles');
const DEBUG = process.env.DEBUG;

// parse json
const conf = parseFiles.parse();
if (!conf) {
  throw new Exception("No config.json found");
}
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

function buildTestUrl(test, port) {
  let url = conf.apiHost;
  if (port)
    url += `:${port}`;
  if (conf.apiRoot)
    url += conf.apiRoot;
  if (test.request.endpoint)
    url += test.request.endpoint

  return url;
}

function buildEnv(port, testSet) {
  return (cb) => {
    // run the env setup file and pass args
    let envScript = exec(`sh test.sh ${port}`)
    envScript.stdout.on('data', (data) => {
      // data should prob return the id of the env for later
      let res = data.trim();
      if (res == "ready") {
        // build api test functions
        let testFns = buildTestFns(testSet, port);

        // run api test functions
        console.log(`Running Test Set: ${testSet.id}`);
        if (testSet.description) {
          console.log(`${testSet.description}`);
        }
        let flow = conf["controlFlow"] || "parallel";
        async[flow](testFns, (err, testResults) => {
          // pass test results
          let testSetResults = {
            name: testSet.id,
            results: testResults
          };

          cb(err, testSetResults);
        });
      }
    });

    envScript.stderr.on('data', (data) => {
      // something didn't work
      cb(data);
    });
  };
}

function buildTestFns(testSet, port) {
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
