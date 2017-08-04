const _ = require('lodash');
const _async = require('async');
const Logger = require('./logger');

class TestManager {
  constructor(conf, envManager, restManager) {
    this.conf = conf;
    this.logger = new Logger(conf);
    this.envManager = envManager;
    this.restManager = restManager;
    this.restApiTestEnvTasks = [];
    this.uiTestSetTasks =[];
  }

  buildTestEnvTasks() {
    let conf = this.conf;
    this.logger.debug('buildTestEnvTasks');

    // TODO: logic for iterating different test adapters.
    let parallelismCount = 1;
    if (conf.restApi && !conf.restApi.skip && !conf.cmdOpts.skipREST) {
      // build and env per test set while keeping track of parallelism
      let currentPort = conf.restApi.port;
      _.forEach(conf.restApi.testEnvs, (testEnv, id) => {
        // make sure tests exist for this testEnv
        if (_.isEmpty(testEnv.testSets)) { return; }
        let hasTests = false;
        _.forEach(testEnv.testSets, (testSet, id) => {
          if (testSet.tests && testSet.tests.length > 1) {
            hasTests = true;
            return false;
          }
        });
        if (!hasTests) { return; }

        // make sure we haven't exceeded our max testSet
        if (parallelismCount > conf.env.parallelism) {
          // reset port and parallelismCount
          parallelismCount = 1;
          currentPort = conf.restApi.port;
        }

        // build the TestEnv task
        this.restApiTestEnvTasks.push(this.buildRESTApiTestEnvTask(currentPort, testEnv.testSets));
        // _.forEach(testEnv.testSets, (testSet, id) => {
        //   this.restApiTestSetTask.push(this.buildRESTApiTestSetTask(currentPort, testSet));
        // });

        parallelismCount = 1 + parallelismCount;
        if (conf.env.singleServer) {
          // if we're running all our envs on the same server we should increment the
          // env port to avoid collision
          currentPort += 1;
        }
      })
    }

    if (conf.ui && !conf.ui.skip && !conf.cmdOpts.skipUI) {
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

  buildRESTApiTestEnvTask(port, testSets) {
    this.logger.debug(`buildRESTApiTestEnvTask ${port} ${JSON.stringify(testSets)}`);
    let envManager = this.envManager;

    return (cb) => {
      let envId = envManager.generateId();

      let buildEnvFn = async () => {
        await envManager.start(port, envId, this.conf.restApi);
        // should have some if logic here for the future when we support more than just api
        await this.envManager.confirmHealthcheck(port, envId);
        let testSetResults = await this.runRESTApiTestSets(port, envId, testSets);

        return testSetResults;
      }

      buildEnvFn()
        .then((testSetResults) => {
          envManager.stop(envId)
            .then(() => { cb(null, testSetResults); })
            .catch((err) => { cb(err); });
        })
        .catch((err) => {
          console.trace();
          this.logger.debug("buildRESTApiTestEnvTask: ERROR CAUGHT WHILE RUNNING TEST SETS");
          this.logger.debug(err);
          envManager.stop(envId)
            .then(() => { cb(err); })
            .catch((err2) => cb(err2));
        });
    };
  }

  // buildRESTApiTestSetTask(port, testSet) {
  //   this.logger.debug(`buildRESTApiTestSetTask ${port} ${JSON.stringify(testSet)}`);
  //   let envManager = this.envManager;
  //
  //   return (cb) => {
  //     let envId = envManager.generateId();
  //
  //     let buildEnvFn = async () => {
  //       await envManager.start(port, envId);
  //       // should have some if logic here for the future when we support more than just api
  //       await this.envManager.confirmHealthcheck(port, envId);
  //       let testSetResults = await this.runRESTApiTests(port, envId, testSet);
  //
  //       return testSetResults;
  //     }
  //
  //     buildEnvFn()
  //       .then((testSetResults) => {
  //         cb(null, testSetResults);
  //       })
  //       .catch((err) => {
  //         this.logger.debug(err);
  //         envManager.stop(envId).then(() => { cb(err); });
  //       });
  //   };
  // }

  buildUITestSetTask(port, testSet) {
    this.logger.debug(`buildUITestSetTask ${port} ${testSet}`);

    let envManager = this.envManager;

    return (cb) => {
      let envId = envManager.generateId();

      let buildEnvFn = async () => {
        await envManager.start(port, envId, this.conf.ui);
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

  async runRESTApiTestSets(port, envId, testSets) {
    // TODO: logic for running TestSets in order

    return new Promise((resolve, reject) => {
      let testSetPromises = _.map(testSets, (testSet, id) => {
        return this.runRESTApiTestSet(port, envId, testSet);
      });

      let testSetResults;
      let testSetErr;
      try {
        testSetResults = Promise.all(testSetPromises);
      } catch (e) {
        testSetErr = e;
      }

      if (testSetErr) {
        this.logger.debug(`runRESTApiTestSets ERROR encountered while running testSetPromises`);
        reject(testSetErr);
      } else {
        resolve(testSetResults);
      }
    });

  }

  async runRESTApiTestSet(port, envId, testSet) {
    this.logger.debug(`runRESTApiTestSet ${port} ${envId} ${testSet.id}`);

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

      let flow = this.conf['controlFlow'] || 'parallel';
      _async[flow](testFns, (err2, testResults) => {
        // pass test results
        let testSetResults = {
          name: testSet.id,
          results: testResults
        };

        if (err2) {
          this.logger.debug('runRESTApiTestSet ERROR while running tests');
          this.logger.debug(err2);
          reject(err2);
        } else {
          resolve(testSetResults);
        }
      });
    });
  }

  async runUITests(port, envId, testSet) {
    this.logger.debug(`runUITests ${port} ${envId} ${testSet.id}`);

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

      let flow = this.conf['controlFlow'] || 'parallel';
      _async[flow](testFns, (err2, testResults) => {
        // pass test results
        let testSetResults = {
          name: testSet.id,
          results: testResults
        };

        if (err2) {
          reject(err2);
        } else {
          resolve(testSetResults);
        }
      });
    });
  }
}

module.exports = TestManager;
