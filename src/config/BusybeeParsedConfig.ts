import * as uuidv1 from 'uuid/v1';
import {TestSuiteConfig} from "./user/TestSuiteConfig";
import {BusybeeUserConfig} from "./BusybeeUserConfig";
import {Logger} from "../lib/Logger";
import * as glob from 'glob';
import * as fs from 'fs';
import * as _ from 'lodash';
import {EnvResourceConfig} from "./common/EnvResourceConfig";
import {ParsedTestSuite} from "./parsed/ParsedTestSuiteConfig";
import {FilePathsConfig} from "./parsed/FilePathsConfig";
import {TypedMap} from "../lib/TypedMap";

export class BusybeeParsedConfig {
  private logger: Logger;
  private testSet2EnvMap = new TypedMap<string>();
  private env2TestSuiteMap = new TypedMap<string>();

  filePaths: FilePathsConfig;
  cmdOpts: any;
  logLevel: string;
  parsedTestSuites: TypedMap<ParsedTestSuite>;
  envResources: EnvResourceConfig[];
  onComplete: string;

  constructor(userConfig: BusybeeUserConfig, cmdOpts: any, mode: string) {
    this.cmdOpts = cmdOpts;
    this.logLevel = this.getLogLevel(cmdOpts);
    this.logger = new Logger({logLevel: this.logLevel}, this);
    this.filePaths = new FilePathsConfig(cmdOpts);
    this.onComplete = userConfig.onComplete;
    this.parsedTestSuites = this.parseTestSuites(userConfig, mode);
    this.envResources = userConfig.envResources;

    if (cmdOpts.localMode) {
      this.logger.info(`LocalMode detected. Host Configuration will be ignored in favor of 'localhost'`);
    }
  }

  toJSON() {
    return {
      parsedTestSuites: this.parsedTestSuites,
      envResources: this.envResources,
      logLevel: this.logLevel
    }
  }

  getTestSet2EnvMap(): TypedMap<string> {
    return this.testSet2EnvMap;
  }

  getEnv2TestSuiteMap(): TypedMap<string> {
    return this.env2TestSuiteMap;
  }

  parseTestSuites(userConf: BusybeeUserConfig, mode: string): TypedMap<ParsedTestSuite> {
    let parsedTestSuites = new TypedMap<ParsedTestSuite>();
    // see if the user specified to skip testSuites
    let skipTestSuites;
    if (this.cmdOpts.skipTestSuite) {
      skipTestSuites = this.cmdOpts.skipTestSuite.split(',');
    }

    // TODO: figure out why we can only pass 1 testSuite when in mock mode. in theory we should be able to parse all
    // test suites regardless of mode. However, if we do...for some reason the test suite to be mocked does not include
    // any tests.
    if (mode === 'mock') {
      let testSuite = _.find(userConf.testSuites, (suite) => { return suite.id == this.cmdOpts.testSuite; });
      let parsedTestSuite = this.parseTestSuite(testSuite, testSuite.id, mode);
      parsedTestSuites.set(parsedTestSuite.suiteID, parsedTestSuite);
      this.logger.debug(this.parsedTestSuites, true);
    } else {
      userConf.testSuites.forEach((testSuite) => {
        let suiteID = testSuite.id || uuidv1();
        if (skipTestSuites && skipTestSuites.indexOf(suiteID)) {
          return;
        }

        // parse this testSuite
        let parsedTestSuite = this.parseTestSuite(testSuite, suiteID, mode);
        parsedTestSuites.set(parsedTestSuite.suiteID, parsedTestSuite);
        this.logger.debug(this.parsedTestSuites, true);
      });
    }


    return this.parseTestFiles(parsedTestSuites, mode);
  }

  parseTestSuite(testSuite: TestSuiteConfig, suiteID: string, mode: string): ParsedTestSuite {
    this.logger.debug(`parseTestSuite userConf testSuite ${suiteID} ${mode}`);

    // create an id for this testSuite
    console.log(JSON.stringify(testSuite, null, '\t'));
    return new ParsedTestSuite(testSuite, mode, this.testSet2EnvMap, this.env2TestSuiteMap);
  }

  /*
    Discovers any test files, parses them, and inserts them into the testSuites/envs that they belong
   */
  parseTestFiles(parsedTestSuites, mode) {
      this.logger.debug(`parseFiles`);
      this.logger.debug(this.env2TestSuiteMap, true);
      this.logger.debug(this.testSet2EnvMap, true);
      let files = glob.sync(`${this.filePaths.busybeeDir}/**/*.json`, {ignore:`${this.filePaths.userConfigFile}`});

      // parse json files, compile testSets and add them to the conf.
      this.logger.info("parsing files...");
      files.forEach((file) => {
        this.logger.info(file);

        let data = fs.readFileSync(file, 'utf8');
        var tests = JSON.parse(data);
        if (!Array.isArray(tests)) {
          tests = [tests];
        }

        tests.forEach((test) => {
          if (test.skip) { return; }
          if (mode == 'test') {
            if (test.mock) { return; }
          }
          if (mode == 'mock') {
            test.testSet = { id: 'default' }
          }

          if (_.isUndefined(test.testSet)) {
            this.logger.info(`test '${test.name}' does not contain required prop 'testSet'. Skipping`);

            return;
          }

          // support multiple testSets
          if (!Array.isArray(test.testSet)) {
            test.testSet = [test.testSet];
          }

          // iterate each testSet entry for this test (1 test can run in multiple testSets)
          test.testSet.forEach((testSetInfo) => {
            // lookup the env that this TestSet is a member of
            if (_.isUndefined(this.testSet2EnvMap.get(testSetInfo.id))) {
              this.logger.warn(`Unable to identify the Test Environment containing the testSetId '${testSetInfo.id}'.`);
              return;
            }

            let testEnvId = this.testSet2EnvMap.get(testSetInfo.id);

            // lookup the suite that this env is a member of
            if (_.isUndefined(this.env2TestSuiteMap.get(testEnvId))) {
              this.logger.warn(`Unable to identify the Test Suite containing the envId ${testEnvId}.`);
              return;
            }

            let suiteID = this.env2TestSuiteMap.get(testEnvId);
            if (_.isUndefined(testSetInfo.index)) {
              // push it on the end
              parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id).tests.push(test);
              //conf.restApi.testEnvs[testEnvId].testSets[testSetInfo.id].tests.push(test);
            } else {
              // insert it at the proper index, fill any empty spots along the way
              Array(testSetInfo.index + 1).fill(null).forEach((d,i) => {
                if (i == testSetInfo.index) {
                  parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id).tests[i] = test;
                } else {
                  if (!parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id).tests[i]) {
                    parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id).tests[i] = {};
                  }
                }
              });
            }
          });
        });
      });

      return parsedTestSuites;
  }

  getLogLevel(cmdOpts: any) {
    let logLevel;
    if (process.env.BUSYBEE_DEBUG) {
      logLevel = 'DEBUG';
    } else if (process.env.BUSYBEE_LOG_LEVEL) {
      if (Logger.isLogLevel(process.env.BUSYBEE_LOG_LEVEL)) {
        logLevel = process.env.BUSYBEE_LOG_LEVEL;
      }
    } else if (cmdOpts) {
      if (this.cmdOpts.debug) {
        logLevel = 'DEBUG';
      } else if (cmdOpts.logLevel) {
        if (Logger.isLogLevel(cmdOpts.logLevel)) {
          logLevel = cmdOpts.logLevel;
        }
      }
    }

    return logLevel;
  }
}
