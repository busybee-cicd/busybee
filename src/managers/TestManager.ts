import * as _ from 'lodash';
import {Logger} from "../lib/Logger";
import {RESTSuiteManager} from './RESTSuiteManager';
import {GenericSuiteManager} from './GenericSuiteManager';
import {EnvManager} from "./EnvManager";
import {BusybeeParsedConfig} from "../models/config/BusybeeParsedConfig";
import {SuiteEnvInfo} from "../lib/SuiteEnvInfo";
import {EnvResult} from "../models/results/EnvResult";
import {ParsedTestSuite} from "../models/config/parsed/ParsedTestSuiteConfig";
import {ParsedTestEnvConfig} from "../models/config/parsed/ParsedTestEnvConfig";

export class TestManager {

  testSuiteTasks: any;
  private conf: BusybeeParsedConfig;
  private logger: Logger;
  private envManager: EnvManager;

  constructor(conf: BusybeeParsedConfig, envManager: EnvManager) {
    this.conf = _.cloneDeep(conf);
    this.logger = new Logger(conf, this);
    this.envManager = envManager;
    this.testSuiteTasks = {};
  }

  buildTestSuiteTasks() {
    this.logger.trace('buildTestSuiteTasks');
    let conf = this.conf;
    conf.parsedTestSuites.forEach((testSuite: ParsedTestSuite, suiteID: string) => {
      if (testSuite.skip) {
        return;
      }
      // parse the envs of this TestSuite
      this.testSuiteTasks[suiteID] = {envTasks: []};
      //conf.parsedTestSuites[suiteID].envTasks = [];
      this.logger.trace(suiteID);
      this.logger.trace(testSuite);
      this.logger.trace(`Processing ${suiteID} : type = ${testSuite.type}`);
      testSuite.testEnvs.forEach((testEnv: ParsedTestEnvConfig, suiteEnvID: string) => {
        this.logger.trace(`testEnv: ${testEnv}`);
        this.logger.trace(`suiteEnvID: ${suiteEnvID}`);

        // Check to see if a specific set of envId's has been passed. If so, only run those
        if (this.conf.getEnvInstancesToRun().length > 0) {
          if (this.conf.getEnvInstancesToRun().indexOf(suiteEnvID) === -1) {
            this.logger.debug(`Skipping envInstance with id ${suiteEnvID}`);
            return;
          }
        }

        if (testSuite.type === 'USER_PROVIDED') {
          this.testSuiteTasks[suiteID].envTasks.push(this.buildTestEnvTask(suiteID, testEnv.suiteEnvID));
        } else if (testSuite.type === 'REST' || _.isUndefined(testSuite.type)) {
          // 1. make sure testSets exist for this testEnv
          if (_.isEmpty(testEnv.testSets)) {
            this.logger.trace(`testEnv ${testEnv.suiteEnvID} contains 0 testSets. skipping`);
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
            this.logger.trace(`testEnv ${testEnv.suiteEnvID} contains 0 tests. skipping`);
            return;
          }

          this.testSuiteTasks[suiteID].envTasks.push(this.buildRESTTestEnvTask(suiteID, testEnv.suiteEnvID));
        }
      });
    });
  }

  buildRESTTestEnvTask(suiteID: string, suiteEnvID: string) {
    this.logger.trace(`buildRESTTestEnvTask ${suiteID} ${suiteEnvID}`);

    var generatedEnvID;
    return (cb: (err: any, envResult: EnvResult) => void) => {
      let currentEnv: SuiteEnvInfo;
      let restManager: RESTSuiteManager;
      let testSetResults;
      let _cb = _.once(cb); // ensure cb is only called once

      let buildEnvFn = async () => {
        generatedEnvID = this.envManager.generateId();

        await this.envManager.start(generatedEnvID, suiteID, suiteEnvID);
        currentEnv = this.envManager.getCurrentEnv(generatedEnvID);
        // create a restmanager to handle these tests
        restManager = new RESTSuiteManager(this.conf, currentEnv);
        testSetResults = await restManager.runRESTApiTestSets(currentEnv); // returns an array of testSets

        let envResult = EnvResult.new('REST', suiteID, suiteEnvID);
        envResult.testSets = testSetResults;

        return envResult;
      };

      // we never want to call the err cb from here. If the Test Env has a failure we will report it
      buildEnvFn()
        .then((envResult: EnvResult) => {
          this.envManager.stop(generatedEnvID)
            .then(() => {
              _cb(null, envResult);
            })
            .catch((err2) => {
              this.logger.error(`buildRESTTestEnvTask: Error Encountered While Stopping ${generatedEnvID}`);
              this.logger.error(err2);
              envResult.error = err2;
              _cb(null, envResult);
            });
        })
        .catch((err2) => {
          this.logger.error(`buildRESTTestEnvTask: Error Encountered While Running Tests for ${generatedEnvID}`);
          this.logger.error(err2);
          let envResult = EnvResult.new('REST', suiteID, suiteEnvID);
          envResult.testSets = [];
          envResult.error = err2;
          this.envManager.stop(generatedEnvID)
            .then(() => {
              _cb(null, envResult);
            })
            .catch((err3) => {
              this.logger.error(`buildRESTTestEnvTask: Error Encountered While Stopping ${generatedEnvID}`);
              this.logger.error(err3);
              envResult.error = err3;
              _cb(null, envResult)
            });
        });
    };
  }

  /*
   TODO: use the GenericSuiteManager to kick off tests
   */
  buildTestEnvTask(suiteID, suiteEnvID) {
    this.logger.trace(`buildTestEnvTask ${suiteID} ${suiteEnvID}`);

    let generatedEnvID = this.envManager.generateId();
    return (cb) => {
      let buildEnvFn = async() => {
        await this.envManager.start(generatedEnvID, suiteID, suiteEnvID);
        let currentEnv: SuiteEnvInfo = this.envManager.getCurrentEnv(generatedEnvID);
        // create a GenericSuiteManager to handle coordinating these tests
        let suiteManager = new GenericSuiteManager(this.conf, currentEnv, this.envManager);
        let testSetResults = await suiteManager.runTestSets(generatedEnvID);

        return testSetResults;
      }

      buildEnvFn()
        .then((testSetResults) => {
          this.logger.trace("TEST SET SUCCESS");
          this.envManager.stop(generatedEnvID)
            .then(() => {
              cb(null, testSetResults);
            })
            .catch((err) => {
              cb(err);
            });
        })
        .catch((err) => {
          this.logger.error("buildTestEnvTask: ERROR CAUGHT WHILE RUNNING TEST SETS");
          this.logger.error(err);
          this.envManager.stop(generatedEnvID)
            .then(() => {
              cb(err);
            })
            .catch((err2) => cb(err2));
        });
    };
  }
}
