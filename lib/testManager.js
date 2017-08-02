const _ = require('lodash');
const _async = require('async');

class TestManager {
  constructor(conf, envManager, restManager) {
    this.conf = conf;
    this.envManager = envManager;
    this.restManager = restManager;
    this.restApiTestSetTask = [];
    this.uiTestSetTasks =[];
  }

  buildTestSetTasks() {
    let conf = this.conf;
    if (conf.debug) {
      console.log('buildTestSetTasks')
    }

    // TODO: logic for iterating different test adapters.
    let parallelismCount = 1;
    if (conf.restApi) {
      // build and env per test set while keeping track of parallelism
      let currentPort = conf.restApi.port;
      _.forEach(conf.restApi.testSets, (testSet, id) => {
        if (_.isEmpty(testSet.tests)) { return; }
        if (parallelismCount > conf.env.parallelism) {
          // reset port and parallelismCount
          parallelismCount = 1;
          currentPort = conf.restApi.port;
        }

        this.restApiTestSetTask.push(this.buildRESTApiTestSetTask(currentPort, testSet));

        parallelismCount = 1 + parallelismCount;
        if (conf.env.singleServer) {
          // if we're running all our envs on the same server we should increment the
          // env port to avoid collision
          currentPort += 1;
        }
      });
    }

    if (conf.ui) {
      let currentPort = conf.ui.port;
      _.forEach(conf.ui.testSets, (testSet, id) => {
        if (parallelismCount > conf.env.parallelism) {
          // reset port and parallelismCount
          parallelismCount = 1;
          currentPort = conf.ui.port;
        }

        this.uiTestSetTasks.push(this.buildUITestSetTask(currentPort, testSet));

        parallelismCount = 1 + parallelismCount;
        if (conf.env.singleServer) {
          // if we're running all our envs on the same server we should increment the
          // env port to avoid collision
          currentPort += 1;
        }
      });
    }

  }

  buildRESTApiTestSetTask(port, testSet) {
    if (this.conf.debug) {
      console.log(`buildRESTApiTestSetTask ${port} ${JSON.stringify(testSet)}`);
    }
    let envManager = this.envManager;

    return (cb) => {
      let envId = envManager.generateId();

      let buildEnvFn = async () => {
        await envManager.start(port, envId);
        // should have some if logic here for the future when we support more than just api
        await this.envManager.confirmHealthcheck(port, envId);
        let testSetResults = await this.runRESTApiTests(port, envId, testSet);

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

  buildUITestSetTask(port, testSet) {
    if (this.conf.debug) {
      console.log(`buildUITestSetTask ${port} ${testSet}`);
    }
    let envManager = this.envManager;

    return (cb) => {
      let envId = envManager.generateId();

      let buildEnvFn = async () => {
        await envManager.start(port, envId);
        // should have some if logic here for the future when we support more than just api
        await this.envManager.confirmHealthcheck(port, envId);
        let testSetResults = await this.runUITests(port, envId, testSet);

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

  async runRESTApiTests(port, envId, testSet) {
    let conf = this.conf;
    if (conf.debug) {
      console.log(`runRESTApiTests ${port} ${envId} ${testSet.id}`);
    }

    return new Promise((resolve, reject) => {
      // build api test functions
      if (!testSet.tests) {
        reject(`testSet ${testSet.id} has no tests`);
      }

      let testFns = this.restManager.buildTestTasks(testSet, port);

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

  async runUITests(port, envId, testSet) {
    let conf = this.conf;
    if (conf.debug) {
      console.log(`runUITests ${port} ${envId} ${testSet.id}`);
    }

    return new Promise((resolve, reject) => {
      // build api test functions
      if (!testSet.tests) {
        reject(`testSet ${testSet.name} has no tests`);
      }


      let testFns = this.restManager.buildTestTasks(testSet, port);

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
