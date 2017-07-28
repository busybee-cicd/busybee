const _ = require('lodash');
const _async = require('async');

class TestManager {
  constructor(conf, envManager, apiManager) {
    this.conf = conf;
    this.envManager = envManager;
    this.apiManager = apiManager;
    this.testSetTasks = [];
  }

  buildApiTestSetTasks() {
    let conf = this.conf;
    if (conf.debug) {
      console.log('buildApiTestSetTasks')
    }

    // build and env per test set while keeping track of parallelism
    let parallelismCount = 1;
    let currentPort = conf.apiPort;
    _.forEach(conf.testSets, (testSet, id) => {
      if (parallelismCount > conf.env.parallelism) {
        // reset port and parallelismCount
        parallelismCount = 1;
        currentPort = conf.apiPort;
      }

      this.testSetTasks.push(this.buildApiTestSetTask(currentPort, testSet));

      parallelismCount = 1 + parallelismCount;
      if (conf.env.singleServer) {
        // if we're running all our envs on the same server we should increment the
        // env port to avoid collision
        currentPort += 1;
      }
    });
  }

  buildApiTestSetTask(port, testSet) {
    if (this.conf.debug) {
      console.log(`buildApiTestSetTask ${port} ${testSet}`);
    }
    let envManager = this.envManager;

    return (cb) => {
      let envId = envManager.generateId();

      let buildEnvFn = async () => {
        await envManager.start(port, envId);
        // should have some if logic here for the future when we support more than just api
        await this.apiManager.confirmHealthcheck(port, envId);
        let testSetResults = await this.runApiTests(port, envId, testSet);

        return testSetResults;
      }

      buildEnvFn()
        .then((testSetResults) => {
          cb(null, testSetResults);
        })
        .catch((err) => {
          envManager.stop(envId).then(() => { cb(err); });
        });
    };
  }

  async runApiTests(port, envId, testSet) {
    let conf = this.conf;
    if (conf.debug) {
      console.log(`runApiTests ${port} ${envId} ${testSet}`);
    }

    return new Promise((resolve, reject) => {
      // build api test functions
      if (!testSet.tests) {
        reject(`testSet ${testSet.name} has no tests`);
      }

      let testFns = this.apiManager.buildApiTestTasks(testSet, port);

      // run api test functions
      console.log(`Running Test Set: ${testSet.id}`);
      if (testSet.description) {
        console.log(`${testSet.description}`);
      }

      let flow = conf['controlFlow'] || 'parallel';
      _async[flow](testFns, (err2, testResults) => {
        // pass test results
        let testSetResults = {
          name: testSet.id,
          results: testResults
        };

        this.envManager.stop(envId)
          .then(() => {
            if (err2) {
              reject(err2);
            } else {
              resolve(testSetResults);
            }
          });
      });
    });
  }
}

module.exports = TestManager;
