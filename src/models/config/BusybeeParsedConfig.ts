import * as uuidv1 from 'uuid/v1';
import {TestSuiteConfig} from "./user/TestSuiteConfig";
import {BusybeeUserConfig} from "./BusybeeUserConfig";
import {Logger} from "../../lib/Logger";
import * as glob from 'glob';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as path from 'path';
import {EnvResourceConfig} from "./common/EnvResourceConfig";
import {ParsedTestSuite} from "./parsed/ParsedTestSuiteConfig";
import {FilePathsConfig} from "./parsed/FilePathsConfig";
import {TypedMap} from "../../lib/TypedMap";
import {RESTTest} from "../RESTTest";
import {ParsedTestEnvConfig} from "./parsed/ParsedTestEnvConfig";
import {ParsedTestSetConfig} from "./parsed/ParsedTestSetConfig";

export class BusybeeParsedConfig {
  private logger: Logger;
  private testSet2EnvMap = new TypedMap<string>();
  private env2TestSuiteMap = new TypedMap<string>();
  private testFiles: string[] = [];
  private skipTestSuites: string[] = [];
  private envInstancesToRun: string[] = [];

  filePaths: FilePathsConfig;
  cmdOpts: any;
  logLevel: string;
  parsedTestSuites: TypedMap<ParsedTestSuite>;
  envResources: EnvResourceConfig[];
  onComplete: string;
  reporters: Array<any>

  constructor(userConfig: BusybeeUserConfig, cmdOpts: any, mode: string) {
    this.cmdOpts = cmdOpts;
    this.logLevel = this.getLogLevel();
    this.logger = new Logger({logLevel: this.logLevel}, this);
    this.parseCmdOpts();
    this.filePaths = new FilePathsConfig(cmdOpts);
    this.onComplete = userConfig.onComplete;
    this.parsedTestSuites = this.parseTestSuites(userConfig, mode);
    this.envResources = userConfig.envResources;
    this.reporters = userConfig.reporters;

    if (cmdOpts.localMode) {
      this.logger.info(`LocalMode detected. Host Configuration will be ignored in favor of 'localhost'`);
    }
  }

  parseCmdOpts() {
    if (this.cmdOpts.skipTestSuite) {
      this.skipTestSuites = this.cmdOpts.skipTestSuite.split(',');
    }
    if (this.cmdOpts.testFiles) {
      this.testFiles = this.cmdOpts.testFiles.split(',');
    }
    if (this.cmdOpts.envInstances) {
      this.envInstancesToRun = this.cmdOpts.envInstances.split(',');
    }
  }

  getEnvInstancesToRun(): string[] {
    return this.envInstancesToRun;
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
    this.logger.trace(`parseTestSuites`);
    let parsedTestSuites = new TypedMap<ParsedTestSuite>();
    // see if the user specified to skip testSuites

    // TODO: figure out why we can only pass 1 testSuite when in mock mode. in theory we should be able to parse all
    // test suites regardless of mode. However, if we do...for some reason the test suite to be mocked does not include
    // any tests.
    if (mode === 'mock') {
      let testSuite = _.find(userConf.testSuites, (suite) => { return suite.id == this.cmdOpts.testSuite; });
      let parsedTestSuite = this.parseTestSuite(testSuite, mode);
      parsedTestSuites.set(parsedTestSuite.suiteID, parsedTestSuite);
    } else {
      userConf.testSuites.forEach((testSuite) => {
        let suiteID = testSuite.id || uuidv1();
        this.logger.trace(`suiteID: ${suiteID}`);
        this.logger.trace(`skipTestSuites: ${JSON.stringify(this.skipTestSuites)}`);
        if (_.find(this.skipTestSuites, (sID) => { return sID === suiteID; })) {
          this.logger.trace(`Skipping testSuite: ${suiteID}`);
          return;
        }

        // parse this testSuite
        let parsedTestSuite = this.parseTestSuite(testSuite, mode);
        parsedTestSuites.set(parsedTestSuite.suiteID, parsedTestSuite);
        this.logger.trace(parsedTestSuites);
      });
    }

    return this.parseTestFiles(parsedTestSuites, mode);
  }

  parseTestSuite(testSuite: TestSuiteConfig, mode: string): ParsedTestSuite {
    this.logger.trace(`parseTestSuite ${testSuite.id} ${mode}`);

    // create an id for this testSuite
    return new ParsedTestSuite(testSuite, mode, this.testSet2EnvMap, this.env2TestSuiteMap);
  }

  /*
    Discovers any test files, parses them, and inserts them into the testSuites/envs that they belong
   */
  parseTestFiles(parsedTestSuites: TypedMap<ParsedTestSuite>, mode: string) {
    this.logger.trace(`parseTestFiles`);
    this.logger.trace(this.env2TestSuiteMap, true);
    this.logger.trace(this.testSet2EnvMap, true);
    // build up a list of testFolders
    let testFolders = [];
    parsedTestSuites.values().map(pst => {
      if (pst.testFolder) {
        testFolders.push(path.join(this.filePaths.busybeeDir, pst.testFolder, '/**/*.json'));
        testFolders.push(path.join(this.filePaths.busybeeDir, pst.testFolder, '/**/*.js'));
      }
    });

    let files = glob.sync(`{${testFolders.join(',')}}`, {ignore:`${this.filePaths.userConfigFile}`});

    // parse json files, compile testSets and add them to the conf.
    this.logger.info("parsing files...");
    files.forEach((file: string) => {
      // support for running specific tests files
      if (this.testFiles.length > 0 && !_.find(this.testFiles, (fileName) => { return file.endsWith(fileName); })) {
        this.logger.info(`skipping ${file}`);
        return;
      } else {
        this.logger.info(`parsing ${file}`);
      }

      // require all .js and .json files
      let tests;
      if (file.endsWith('.js')) {
        tests = require(file);
      } else {
        tests = JSON.parse(fs.readFileSync(file, 'utf8').toString());
      }

      // ensure that all of our testFiles return arrays of tests and not just a single test object
      if (!Array.isArray(tests)) {
        tests = [tests];
        this.logger.trace("is not array of tests");
      }

      tests.forEach((test) => {
        this.logger.trace(test);
        test = new RESTTest(test);

        // run through various business logic scenarios to determine if the current test should be parsed
        if (test.skip) { return; }

        if (mode === 'test') {
          if (!test.expect || !test.expect.status || !test.expect.body) {
            this.logger.debug(`test.expect not defined for ${test.id}. Skipping`);
            return;
          }
        }
        if (mode === 'mock') {
          test.testSet = { id: 'default' }
          if (!test.expect && !test.mockResponse) {
            this.logger.warn(`test.expect && test.mockResponse not defined for ${test.id}. Cannot mock!`);
            return;
          }
        }

        if (_.isUndefined(test.testSet)) {
          this.logger.info(`test '${test.id}' does not contain required prop 'testSet'. Skipping`);
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

          this.logger.trace(`testSetInfo`);
          this.logger.trace(testSetInfo, true);
          let testEnvId = this.testSet2EnvMap.get(testSetInfo.id);

          // lookup the suite that this env is a member of
          if (_.isUndefined(this.env2TestSuiteMap.get(testEnvId))) {
            this.logger.warn(`Unable to identify the Test Suite containing the envId ${testEnvId}.`);
            return;
          }

          this.logger.trace(`testEnvId`);
          this.logger.trace(testEnvId);
          let suiteID = this.env2TestSuiteMap.get(testEnvId);
          if (_.isUndefined(testSetInfo.index)) {
            // push it on the end
            parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id).testsUnordered.push(test);
            // if (testSetInfo.id === 'asset management') {
            //   this.logger.debug(parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id), true);
            // }
          } else {
            // insert it at the proper index, fill any empty spots along the way
            let existingTests = parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id).tests;
            let newArrLength = testSetInfo.index + 1;
            if (existingTests && existingTests.length > newArrLength) {
              // we need to extend the length of the array to add this at the proper index.
              newArrLength = existingTests.length;
            }

            // create an array of nulls of the current known maxLength and fill it back in.
            Array(newArrLength).fill(null).forEach((d,i) => {
              if (i == testSetInfo.index) {
                parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id).tests[i] = test;
              } else {
                if (!existingTests[i]) {
                  parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id).tests[i] = null;
                }
              }
            });
          }

          // this.logger.trace(`testSet updated`);
          // this.logger.trace(parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id));
        });
      });
    });

    // zip up any tests/unorderedTests
    parsedTestSuites.forEach((pts:ParsedTestSuite, ptsId:string) => {
      pts.testEnvs.forEach((te:ParsedTestEnvConfig, teId:string) => {
        te.testSets.forEach((ts:ParsedTestSetConfig, tsId:string) => {
          ts.tests = ts.tests.concat(ts.testsUnordered);
        });
      })
    });

    return parsedTestSuites;
  }

  getLogLevel() {
    let logLevel;

    if (process.env['BUSYBEE_DEBUG']) {
      logLevel = Logger.DEBUG;
    } else if (process.env['BUSYBEE_LOG_LEVEL']) {
      if (Logger.isLogLevel(process.env['BUSYBEE_LOG_LEVEL'])) {
        logLevel = process.env['BUSYBEE_LOG_LEVEL'];
      }
    } else if (this.cmdOpts) {
      if (this.cmdOpts.debug) {
        logLevel = Logger.DEBUG;
      } else if (this.cmdOpts.logLevel) {
        if (Logger.isLogLevel(this.cmdOpts.logLevel)) {
          logLevel = this.cmdOpts.logLevel;
        }
      }
    }

    return logLevel;
  }
}
