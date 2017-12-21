import * as _ from 'lodash';
import {Logger} from "../lib/Logger";
import {RESTSuiteManager} from './RESTSuiteManager';
import {GenericSuiteManager} from './GenericSuiteManager';
import {EnvManager} from "./EnvManager";
import {BusybeeParsedConfig} from "../models/config/BusybeeParsedConfig";
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
      this.logger.debug(`Processing ${suiteID} : type = ${testSuite.type}`);
      testSuite.testEnvs.forEach((testEnv, suiteEnvID) => {
        this.logger.debug(testEnv);

        if (testSuite.type === 'USER_PROVIDED') {
          this.testSuiteTasks[suiteID].envTasks.push(this.buildTestEnvTask(suiteID, testEnv.suiteEnvID));
        } else if (testSuite.type === 'REST' || _.isUndefined(testSuite.type)) {
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

          this.testSuiteTasks[suiteID].envTasks.push(this.buildRESTTestEnvTask(suiteID, testEnv.suiteEnvID));
        }
      });
    });
  }

  buildRESTTestEnvTask(suiteID, suiteEnvID) {
    this.logger.debug(`buildRESTTestEnvTask ${suiteID} ${suiteEnvID}`);

    let generatedEnvID: string;
    return (cb) => {
      let currentEnv: SuiteEnvInfo;
      let restManager: RESTSuiteManager;
      let testSetResults;

      let buildEnvFn = async () => {
        generatedEnvID = this.envManager.generateId();
        await this.envManager.start(generatedEnvID, suiteID, suiteEnvID);
        currentEnv = this.envManager.getCurrentEnv(generatedEnvID);
        // create a restmanager to handle these tests
        restManager = new RESTSuiteManager(this.conf, currentEnv);
        testSetResults = await restManager.runRESTApiTestSets(currentEnv); // returns an array of testSets

        // decorate the results to build a better result object need to decorate this w/ testSuiteID
        return {
          suiteID: suiteID,
          type: "REST",
          env: suiteEnvID,
          testSets: testSetResults
        }
      }

      buildEnvFn()
        .then((testSetResults) => {
          this.envManager.stop(generatedEnvID)
            .then(() => {
              cb(null, testSetResults);
            })
            .catch((err) => {
              cb(err);
            });
        })
        .catch((err) => {
          console.trace();
          this.logger.error("buildRESTTestEnvTask: Error Encountered While Running Tests");
          this.logger.error(err);
          this.envManager.stop(generatedEnvID)
            .then(() => {
              cb(err);
            })
            .catch((err2) => {
              cb(err2)
            });
        });
    };
  }

  /*
    TODO: use the GenericSuiteManager to kick off tests
  */
  buildTestEnvTask(suiteID, suiteEnvID) {
    this.logger.debug(`buildTestEnvTask ${suiteID} ${suiteEnvID}`);

    let generatedEnvID = this.envManager.generateId();
    return (cb) => {
      let buildEnvFn = async () => {
        await this.envManager.start(generatedEnvID, suiteID, suiteEnvID);
        let currentEnv:SuiteEnvInfo = this.envManager.getCurrentEnv(generatedEnvID);
        // create a restmanager to handle these tests
        let suiteManager = new GenericSuiteManager(this.conf, currentEnv, this.envManager);
        let testSetResults = await suiteManager.runTestSets(generatedEnvID);

        return testSetResults;
      }

      buildEnvFn()
        .then((testSetResults) => {
          this.logger.debug("TEST SET SUCCESS");
          this.envManager.stop(generatedEnvID)
            .then(() => { cb(null, testSetResults); })
            .catch((err) => { cb(err); });
        })
        .catch((err) => {
          this.logger.debug("buildTestEnvTask: ERROR CAUGHT WHILE RUNNING TEST SETS");
          this.logger.debug(err);
          this.envManager.stop(generatedEnvID)
            .then(() => { cb(err); })
            .catch((err2) => cb(err2));
        });
    };
  }
}
