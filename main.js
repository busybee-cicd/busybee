const async = require('async');
const { exec } = require('child_process');
const request = require('request');

// parse json
const conf = 
{ 
  "apiRoot": "https://google.com",
  "parallelism": 2,
  "startingPort": 8080,
  "testSets": [
    {
      "name": "users",
      "tests": [
        {
          "request" : {
            "method": "GET",
            "endpoint": "/search",
            "query": {
              "q": "users"
            },
            "body": null,
          },
          "expect": {
            "status": 200,
            "body": null
          }
        }
      ]
    },
    {
      "name": "friends",
      "tests": [
        {
          "request" : {
            "method": "GET",
            "endpoint": "/search",
            "query": {
              "q": "friends"
            },
            "body": null
          },
          "expect": {
            "status": 200,
            "body": null
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
        method: test.request.method
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
        
        cb(null, testResult);
      });
    };
  });
}


// spin up testSets in parallel and then run tests
async.parallelLimit(testSets, conf["parallelism"], (err, results) => {
  console.log(err || results);
});
