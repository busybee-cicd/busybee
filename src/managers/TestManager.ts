import * as _ from 'lodash';
import {Logger} from "../lib/Logger";
import {RESTSuiteManager} from './RESTSuiteManager';
import {GenericSuiteManager} from './GenericSuiteManager';
import {EnvManager} from "./EnvManager";
import {BusybeeParsedConfig} from "../config/BusybeeParsedConfig";
import {SuiteEnvInfo} from "../lib/SuiteEnvInfo";

export class TestManager {

  testSuiteTasks: any;
  private conf: any;
  private logger: Logger;
  private envManager: EnvManager;

  constructor(conf: BusybeeParsedConfig, envManager: EnvManager) {
    this.conf = conf;
    this.logger = new Logger(conf, this);
    this.envManager = envManager;
    this.testSuiteTasks = {};
  }

  buildTestSuiteTasks() {
    this.logger.debug('buildTestSuiteTasks');
    let conf = this.conf;
    conf.parsedTestSuites.forEach((testSuite, suiteID) => {
      if (testSuite.skip) { return; }
      // parse the envs of this TestSuite
      this.testSuiteTasks[suiteID] = { envTasks: [] };
      //conf.parsedTestSuites[suiteID].envTasks = [];
      this.logger.debug(suiteID);
      this.logger.debug(testSuite);
      testSuite.testEnvs.forEach((testEnv, suiteEnvID) => {
        this.logger.debug(testEnv, true);
        if (testSuite.type === "REST") {
          // 1. make sure testSets exist for this testEnv
          if (_.isEmpty(testEnv.testSets)) {
            this.logger.debug(`testEnv ${testEnv.suiteEnvID} contains 0 testSets. skipping`);
            return;
          }
          // 2. confirm the testSet contains tests
          let hasTests = false;
          testEnv.testSets.forEach((testSet) => {
            if (testSet.tests && testSet.tests.length > 0) {
              hasTests = true;
              return false;
            }
          });
          if (!hasTests) {
            this.logger.debug(`testEnv ${testEnv.suiteEnvID} contains 0 tests. skipping`);
            return;
          }

          this.testSuiteTasks[suiteID].envTasks.push(this.buildRESTTestEnvTask(this.envManager, suiteID, testEnv.suiteEnvID));
        } else {
          this.testSuiteTasks[suiteID].envTasks.push(this.buildTestEnvTask(this.envManager, suiteID, testEnv.suiteEnvID));
        }
      });
    });
  }

  buildRESTTestEnvTask(envManager, suiteID, suiteEnvID) {
    this.logger.debug(`buildRESTTestEnvTask ${suiteID} ${suiteEnvID}`);

    let generatedEnvID = envManager.generateId();
    return (cb) => {
      let buildEnvFn = async () => {
        generatedEnvID = await envManager.start(generatedEnvID, suiteID, suiteEnvID);
        let currentEnv: SuiteEnvInfo = envManager.getCurrentEnv(generatedEnvID);
        // create a restmanager to handle these tests
        let restManager = new RESTSuiteManager(this.conf, currentEnv);
        let testSetResults = await restManager.runRESTApiTestSets(currentEnv);

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
          this.logger.error("buildRESTTestEnvTask: ERROR CAUGHT WHILE RUNNING TEST SETS");
          this.logger.error(err);
          envManager.stop(generatedEnvID)
            .then(() => { cb(err); })
            .catch((err2) => cb(err2));
        });
    };
  }

  /*
    TODO: use the GenericSuiteManager to kick off tests
  */
  buildTestEnvTask(envManager, suiteID, suiteEnvID) {
    this.logger.debug(`buildTestEnvTask ${suiteID} ${suiteEnvID}`);

    let generatedEnvID = envManager.generateId();
    return (cb) => {
      let buildEnvFn = async () => {
        generatedEnvID = await envManager.start(generatedEnvID, suiteID, suiteEnvID);
        let currentEnv = envManager.getCurrentEnv(generatedEnvID);
        // create a restmanager to handle these tests
        let suiteManager = new GenericSuiteManager(this.conf, currentEnv, envManager);
        let testSetResults = await suiteManager.runTestSets(generatedEnvID);

        return testSetResults;
      }

      buildEnvFn()
        .then((testSetResults) => {
          this.logger.debug("TEST SET SUCCESS");
          envManager.stop(generatedEnvID)
            .then(() => { cb(null, testSetResults); })
            .catch((err) => { cb(err); });
        })
        .catch((err) => {
          this.logger.debug("buildTestEnvTask: ERROR CAUGHT WHILE RUNNING TEST SETS");
          this.logger.debug(err);
          envManager.stop(generatedEnvID)
            .then(() => { cb(err); })
            .catch((err2) => cb(err2));
        });
    };
  }
}
