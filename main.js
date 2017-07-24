const async = require('async');
const { exec } = require('child_process');
const request = require('request');
const _ = require('lodash');

// parse json
const conf = 
{ 
  "apiRoot": "https://www.foaas.com",
  "parallelism": 2,
  "startingPort": 8080,
  "testSets": [
    // a test set that needs its own env
    {
      "name": "set1",
      "tests": [
        {
          "request" : {
            "method": "GET",
            "endpoint": "/because/kevin",
            "query": null,
            "body": null
          },
          "expect": {
            "status": 200,
            "body": {
              "message": "Why? Because fuck you, that's why.",
              "subtitle": "- kevin"
            }
          }
        }
      ]
    },
    // another test set that needs its own env
    {
      "name": "set2",
      "tests": [
        {
          "request" : {
            "method": "GET",
            "endpoint": "/awesome/steve",
            "query": null,
            "body": null
          },
          "expect": {
            "status": 200,
            "body": {
              "message": "This is Fucking Awesome.",
              "subtitle": "- steve"
            }
          }
        }
      ]
    }
  ]
};


// build and env per test set while keeping track of parallelism
let parallelismCount = 0;
let currentPort = conf["startingPort"];
let testSets = [];
conf["testSets"].forEach((set) => {
  if (parallelismCount > conf["parallelism"]) {
    // reset port and count
    parallelismCount = 0;
    currentPort = conf["startingPort"];
  }
  
  testSets.push(buildEnv(currentPort, set["tests"]));

  parallelismCount = 1 + parallelismCount;
  currentPort = 1 + currentPort;
});


function buildEnv(port, tests) {
  return (cb) => {
    // run the env setup file and pass args
    let envScript = exec(`sh test.sh ${port}`)
    envScript.stdout.on('data', (data) => {
      // data should prob return the id of the env for later
      let res = data.trim();
      if (res == "ready") {
        // build api test functions
        let testFns = buildTestFns(tests);
        
        // run api test functions
        let flow = conf["controlFlow"] || "parallel";
        async[flow](testFns, (err, results) => {
          // pass test results
          cb(err, results);
        });
      }
    });
    
    envScript.stderr.on('data', (data) => {
      // something didn't work
      cb(data);
    });
  };
}

function buildTestFns(tests) {
  return tests.map((test) => {
    return (cb) => {
      // build request
      let opts = {
        url: conf["apiRoot"] + test.request.endpoint,
        method: test.request.method,
        json: true
      };
      
      if (test["body"])
        opts = Object.assign({}, opts, {"body": test["body"]});
      
      if (test["query"])
        opts = Object.assign({}, opts, {"qs": test["query"]});
      
      // make request
      request(opts, (err, res, body) => {
        if (err)
          cb(err);
        
        // validate results
        let testResult = {};
        
        if (test.expect.status) {
          testResult["status"] = res.statusCode == test.expect.status
            ? true
            : `Expected ${test.expect.status} was ${res.statusCode}`
        }
        
        if (test.expect.body) {
          testResult["body"] = _.isEqual(body, test.expect.body)
            ? true
            : `Expected ${JSON.stringify(test.expect.body)} was ${JSON.stringify(body)}`
        }
        
        cb(null, testResult);
      });
    };
  });
}


// spin up testSets in parallel and then run tests
async.parallelLimit(testSets, conf["parallelism"], (err, results) => {
  console.log(err || results);
});
