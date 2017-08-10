const _ = require('lodash');
const _async = require('async');
const Logger = require('./logger');
const RESTManager = require('./restManager');

class TestManager {
  constructor(conf, envManager) {
    this.conf = conf;
    this.logger = new Logger(conf);
    this.envManager = envManager;
    this.testSuiteTasks = {};
    this.uiTestSetTasks =[];
  }

  buildTestEnvTask() {
    this.logger.debug('buildTestEnvTask');
  }

  buildTestSuiteTasks() {
    this.logger.debug('buildTestSuiteTasks');
    let conf = this.conf;

    _.forEach(conf.parsedTestSuites, (testSuite, suiteID) => {
      if (testSuite.skip) { return; }

      // parse the envs of this TestSuite
      this.testSuiteTasks[suiteID] = { envTasks: [] };
      //conf.parsedTestSuites[suiteID].envTasks = [];
      _.forEach(testSuite.testEnvs, (testEnv, generatedEnvID) => {
        // 1. make sure tests exist for this testEnv
        if (_.isEmpty(testEnv.testSets)) { return; }
        // 2. confirm the testSet contains tests
        let hasTests = false;
        _.forEach(testEnv.testSets, (testSet, testSetID) => {
          if (testSet.tests && testSet.tests.length > 1) {
            hasTests = true;
            return false;
          }
        });
        if (!hasTests) { return; }

        if (testSuite.type === "REST") {
          this.testSuiteTasks[suiteID].envTasks.push(this.buildRESTApiTestEnvTask(suiteID, testEnv.id, testEnv.testSet));
        } else {
          this.logger.debug("TEST SUITE TYPE !== REST");
        }
      });
    });
  }

  buildRESTApiTestEnvTask(suiteID, suiteEnvID, testSets) {
    this.logger.debug(`buildRESTApiTestEnvTask ${suiteID} ${suiteEnvID}`);
    let envManager = this.envManager;

    return (cb) => {
      let generatedEnvID;
      let buildEnvFn = async () => {
        generatedEnvID = await envManager.start(suiteID, suiteEnvID);
        this.logger.debug(`envID ${generatedEnvID} created`);
        let currentEnv = envManager.getCurrentEnv(generatedEnvID);
        // create a restmanager to handle these tests
        let restManager = new RESTManager(this.conf, currentEnv);
        let testSetResults = await this.runRESTApiTestSets(currentEnv, restManager);

        return testSetResults;
      }

      buildEnvFn()
        .then((testSetResults) => {
          envManager.stop(generatedEnvID)
            .then(() => { cb(null, testSetResults); })
            .catch((err) => { cb(err); });
        })
        .catch((err) => {
          console.trace();
          this.logger.debug("buildRESTApiTestEnvTask: ERROR CAUGHT WHILE RUNNING TEST SETS");
          this.logger.debug(err);
          envManager.stop(generatedEnvID)
            .then(() => { cb(err); })
            .catch((err2) => cb(err2));
        });
    };
  }

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

  async runRESTApiTestSets(currentEnv, restManager) {
    this.logger.debug(`runRESTApiTestSets ${currentEnv.suiteID} ${currentEnv.suiteEnvID}`);
    // TODO: logic for running TestSets in order
    return new Promise((resolve, reject) => {
      let testSetPromises = _.map(currentEnv.testSets, (testSet, id) => {
        return this.runRESTApiTestSet(currentEnv.port, testSet, restManager);
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

  async runRESTApiTestSet(port, testSet, restManager) {
    this.logger.debug(`runRESTApiTestSet ${port} ${testSet.id} ${restManager}`);

    return new Promise((resolve, reject) => {
      // build api test functions
      if (!testSet.tests) {
        reject(`testSet ${testSet.id} has no tests`);
      }

      let testFns = restManager.buildTestTasks(testSet, port);

      // run api test functions
      this.logger.info(`Running Test Set: ${testSet.id}`);
      if (testSet.description) {
        this.logger.info(`${testSet.description}`);
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
      this.logger.info(`Running Test Set: ${testSet.id}`);
      if (testSet.description) {
        this.logger.info(`${testSet.description}`);
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
