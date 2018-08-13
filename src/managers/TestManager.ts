import * as _ from 'lodash';
import {Logger, LoggerConf} from 'busybee-util';
import {RESTSuiteManager} from './RESTSuiteManager';
import {GenericSuiteManager} from './GenericSuiteManager';
import {EnvManager} from "./EnvManager";
import {BusybeeParsedConfig} from "../models/config/BusybeeParsedConfig";
import {SuiteEnvInfo} from "../lib/SuiteEnvInfo";
import {EnvResult} from "../models/results/EnvResult";
import {ParsedTestSuite} from "../models/config/parsed/ParsedTestSuiteConfig";
import {ParsedTestEnvConfig} from "../models/config/parsed/ParsedTestEnvConfig";
import { TestWebSocketServer } from '../ws/TestWebSocketServer';
import { resolve } from 'path';


interface TestSuiteTasks {
  [key: string]: TestSuiteTask;
}
interface TestSuiteTask {
  envResults: Promise<EnvResult>[]
}
export class TestManager {

  testSuiteTasks: TestSuiteTasks;
  private conf: BusybeeParsedConfig;
  private logger: Logger;
  private envManager: EnvManager;
  private wsServer: TestWebSocketServer;

  constructor(conf: BusybeeParsedConfig, envManager: EnvManager) {
    this.conf = _.cloneDeep(conf);
    const loggerConf = new LoggerConf(this, conf.logLevel, null);
    this.logger = new Logger(loggerConf);
    this.envManager = envManager;
    this.testSuiteTasks = {};
    if (conf.webSocketPort) {
      let wsConf = {
        port: conf.webSocketPort,
        logLevel: conf.logLevel
      }
      this.wsServer = new TestWebSocketServer(wsConf, this.envManager);
    }
  }

  executeTestSuiteTasks() {
    this.logger.trace('buildTestSuiteTasks');
    let conf = this.conf;
    conf.parsedTestSuites.forEach((testSuite: ParsedTestSuite, suiteID: string) => {
      if (testSuite.skip) {
        return;
      }
      // parse the envs of this TestSuite
      this.testSuiteTasks[suiteID] = { envResults: [] };
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
          this.testSuiteTasks[suiteID].envResults.push(this.executeTestEnvTask(suiteID, testEnv.suiteEnvID));
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

          this.testSuiteTasks[suiteID].envResults.push(this.executeRESTTestEnvTask(suiteID, testEnv.suiteEnvID));
        }
      });
    });
  }

  async executeRESTTestEnvTask(suiteID: string, suiteEnvID: string): Promise<EnvResult>  {
    this.logger.trace(`executeRESTTestEnvTask ${suiteID} ${suiteEnvID}`);

    var generatedEnvID;

    let currentEnv: SuiteEnvInfo;
    let restManager: RESTSuiteManager;
    let testSetResults;
    let envResult = EnvResult.new('REST', suiteID, suiteEnvID);

    let buildEnvFn = async () => {
      generatedEnvID = this.envManager.generateId();

      await this.envManager.start(generatedEnvID, suiteID, suiteEnvID);
      currentEnv = this.envManager.getCurrentEnv(generatedEnvID);
      // create a restmanager to handle these tests
      restManager = new RESTSuiteManager(this.conf, currentEnv);
      testSetResults = await restManager.runRESTApiTestSets(currentEnv); // returns an array of testSets
      envResult.testSets = testSetResults;

      return envResult;
    };

    try {
      return await buildEnvFn();
    } catch (e) {
      this.logger.error(`buildRESTTestEnvTask: Error Encountered While Running Tests for ${generatedEnvID}`);
      envResult.testSets = [];
      envResult.error = e;
      return envResult;
    } finally {
      try {
        await this.envManager.stop(generatedEnvID);
      } catch (e2) {
        this.logger.error(`buildRESTTestEnvTask: Error Encountered While Stopping ${generatedEnvID}`);
      }
    }
  }

  /*
   TODO: use the GenericSuiteManager to kick off tests
   */
  async executeTestEnvTask(suiteID, suiteEnvID): Promise<EnvResult>  {
    this.logger.trace(`executeTestEnvTask ${suiteID} ${suiteEnvID}`);

    let generatedEnvID = this.envManager.generateId();
    let envResult = EnvResult.new('USER_PROVIDED', suiteID, suiteEnvID);

    let buildEnvFn = async () => {
      await this.envManager.start(generatedEnvID, suiteID, suiteEnvID);
      let currentEnv: SuiteEnvInfo = this.envManager.getCurrentEnv(generatedEnvID);
      // create a GenericSuiteManager to handle coordinating these tests
      let suiteManager = new GenericSuiteManager(this.conf, currentEnv, this.envManager);
      let testSetResults = await suiteManager.runTestSets(generatedEnvID);
      
      envResult.testSets = testSetResults;
      return envResult;
    }

    try {
      return await buildEnvFn();
    } catch (e) {
      this.logger.error("buildTestEnvTask: ERROR CAUGHT WHILE RUNNING TEST SETS");
      this.logger.error(e);
      envResult.testSets = [];
      envResult.error = e;

      return envResult;
    } finally {
      try {
        await this.envManager.stop(generatedEnvID);
      } catch (e2) {
        this.logger.error(`buildRESTTestEnvTask: Error Encountered While Stopping ${generatedEnvID}`);
      }
    }
  }

  getTestWebSockerServer():TestWebSocketServer {
    return this.wsServer;
  }
}
