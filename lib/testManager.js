const _ = require('lodash');
const _async = require('async');
const Logger = require('./logger');
const RESTSuiteManager = require('./restSuiteManager');

class TestManager {
  constructor(conf, envManager) {
    this.conf = conf;
    this.logger = new Logger(conf, this);
    this.envManager = envManager;
    this.testSuiteTasks = {};
    this.uiTestSetTasks =[];
  }

  buildTestSuiteTasks() {
    this.logger.debug('buildTestSuiteTasks');
    let conf = this.conf;

    _.forEach(conf.parsedTestSuites, (testSuite, suiteID) => {
      if (testSuite.skip) { return; }

      // parse the envs of this TestSuite
      this.testSuiteTasks[suiteID] = { envTasks: [] };
      //conf.parsedTestSuites[suiteID].envTasks = [];
      _.forEach(testSuite.testEnvs, (testEnv, suiteEnvID) => {
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
          this.testSuiteTasks[suiteID].envTasks.push(this.buildRESTTestEnvTask(this.envManager, suiteID, testEnv.suiteEnvID, testEnv.testSet));
        } else {
          this.logger.debug("TEST SUITE TYPE !== REST");
        }
      });
    });
  }

  buildRESTTestEnvTask(envManager, suiteID, suiteEnvID, testSets) {
    this.logger.debug(`buildRESTTestEnvTask ${suiteID} ${suiteEnvID}`);

    let generatedEnvID = envManager.generateId();
    return (cb) => {
      let buildEnvFn = async () => {
        generatedEnvID = await envManager.start(generatedEnvID, suiteID, suiteEnvID);
        let currentEnv = envManager.getCurrentEnv(generatedEnvID);
        // create a restmanager to handle these tests
        let restManager = new RESTSuiteManager(this.conf, currentEnv);
        let testSetResults = await restManager.runRESTApiTestSets(currentEnv, restManager);

        return testSetResults;
      }

      buildEnvFn()
        .then((testSetResults) => {
          envManager.stop(generatedEnvID)
            .then(() => { cb(null, testSetResults); })
            .catch((err) => { cb(err); });
        })
        .catch((err) => {
          this.logger.debug("buildRESTApiTestEnvTask: ERROR CAUGHT WHILE RUNNING TEST SETS");
          this.logger.debug(err);
          envManager.stop(generatedEnvID)
            .then(() => { cb(err); })
            .catch((err2) => cb(err2));
        });
    };
  }

  /*
    TODO: use the GenericSuiteManager to kick off tests
  */
  buildTestEnvTask(envManager, suiteID, suiteEnvID, testSets) {
    this.logger.debug(`buildTestEnvTask ${suiteID} ${suiteEnvID}`);

    let generatedEnvID = envManager.generateId();
    return (cb) => {
      let buildEnvFn = async () => {
        generatedEnvID = await envManager.start(generatedEnvID, suiteID, suiteEnvID);
        let currentEnv = envManager.getCurrentEnv(generatedEnvID);
        // create a restmanager to handle these tests
        let restManager = new RESTSuiteManager(this.conf, currentEnv);
        let testSetResults = await restManager.runRESTApiTestSets(currentEnv, restManager);

        return testSetResults;
      }

      buildEnvFn()
        .then((testSetResults) => {
          envManager.stop(generatedEnvID)
            .then(() => { cb(null, testSetResults); })
            .catch((err) => { cb(err); });
        })
        .catch((err) => {
          this.logger.debug("buildRESTApiTestEnvTask: ERROR CAUGHT WHILE RUNNING TEST SETS");
          this.logger.debug(err);
          envManager.stop(generatedEnvID)
            .then(() => { cb(err); })
            .catch((err2) => cb(err2));
        });
    };
  }
}

module.exports = TestManager;
