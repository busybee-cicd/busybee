import {MockServerConfig} from "../common/MockServerConfig";
import {RequestOptsConfig} from "../common/RequestOptsConfig";
import {EnvConfig} from "../common/EnvConfig";
import {ParsedTestEnvConfig} from "./ParsedTestEnvConfig";
import {TypedMap} from "../../../lib/TypedMap";
import {TestSuiteConfig} from "../user/TestSuiteConfig";
import {ParsedTestSetConfig} from "./ParsedTestSetConfig";
import {EnvInstanceConfig} from "../user/EnvInstanceConfig";
import {TestSetConfig} from "../user/TestSetConfig";
import {Logger} from "../../../lib/Logger";

export class ParsedTestSuite {
  suiteID: string;
  type: string;
  skip: boolean;
  protocol: string;
  host: string;
  ports: number[];
  defaultRequestOpts: RequestOptsConfig;
  mockServer: MockServerConfig;
  env: EnvConfig;
  testEnvs: TypedMap<ParsedTestEnvConfig>;
  root: string;
  testFolder: string;
  private logger: Logger;

  constructor(suite: TestSuiteConfig, mode: string, testSet2EnvMap: TypedMap<string>, env2TestSuiteMap: TypedMap<string>) {
    this.logger = new Logger({logLevel: process.env.BUSYBEE_LOG_LEVEL}, this);
    this.defaultRequestOpts = suite.defaultRequestOpts;
    this.env = suite.env;
    this.mockServer = suite.mockServer;
    this.ports = suite.ports;
    this.protocol = suite.protocol;
    this.host = suite.host;
    this.suiteID = suite.id;
    this.skip = suite.skip;
    this.type = suite.type;
    this.root = suite.root;
    this.testFolder = suite.testFolder;

    this.testEnvs = new TypedMap<ParsedTestEnvConfig>();
    this.parseSuite(suite, mode, testSet2EnvMap, env2TestSuiteMap);
  }

  parseSuite(testSuite: TestSuiteConfig, mode: string, testSet2EnvMap: TypedMap<string>, env2TestSuiteMap: TypedMap<string>) {

    // assign a default env to this TestSuite IF this is a REST TestSuite to cover cases
    // where the user doesn't specify a testEnv
    if (!testSuite.type || (testSuite.type && testSuite.type.toUpperCase() === 'REST')) {
      let defaultParsedTestEnv = new ParsedTestEnvConfig();
      let tsc = new TestSetConfig();
      tsc.id = 'default';
      let defaultParsedTestSet = new ParsedTestSetConfig(tsc);
      defaultParsedTestSet.id = 'default';
      defaultParsedTestEnv.testSets.set('default', defaultParsedTestSet);

      let defaultEnvInstance = new EnvInstanceConfig();
      defaultEnvInstance.testSets = [];
      defaultEnvInstance.id = 'default';
      let defaultTestSet = new TestSetConfig();
      defaultTestSet.id = 'default';
      defaultEnvInstance.testSets.push(defaultTestSet);
      if (!testSuite.envInstances) {
        testSuite.envInstances = [];
      }
      testSuite.envInstances.push(defaultEnvInstance);
      this.testEnvs.set('default', defaultParsedTestEnv);
    }

    // iterate each user userConfigFile env defined for this testSuite.
    testSuite.envInstances.forEach((testEnvConf: EnvInstanceConfig) => {
      // rename the env's id to suiteEnvID for clarity later 'id' gets thrown around a lot.
      // testEnvConf.suiteEnvID = testEnvConf.id;
      // delete testEnvConf.id;
      // add this env to the env2TestSuiteMap
      this.logger.debug('testEnvConf');
      this.logger.debug(JSON.stringify(testEnvConf));

      let parsedTestEnvConfig = new ParsedTestEnvConfig();
      parsedTestEnvConfig.suiteEnvID = testEnvConf.id;
      env2TestSuiteMap.set(parsedTestEnvConfig.suiteEnvID, this.suiteID);

      if (testEnvConf.testSets) {
        testEnvConf.testSets.forEach((testSetConf: TestSetConfig) => {
          let parsedTestSetConfig = new ParsedTestSetConfig(testSetConf);

          this.logger.debug(`testSetConf ${testSetConf.id}`);
          this.logger.debug(`parsedTestSetConfig ${parsedTestSetConfig.id}`);
          // if this testSet already exists skip it
          if (parsedTestEnvConfig.testSets.get(parsedTestSetConfig.id)) {
            this.logger.info(`Test set ${testSetConf.id} already exists. Skipping`);
            return;
          }

          // add the set to the parsedTestEnvConfig
          parsedTestEnvConfig.testSets.set(testSetConf.id, parsedTestSetConfig);

          // store env lookup for later
          testSet2EnvMap.set(parsedTestSetConfig.id, parsedTestEnvConfig.suiteEnvID);
        });
      }

      this.testEnvs.set(parsedTestEnvConfig.suiteEnvID, parsedTestEnvConfig);
    });

    this.logger.debug(('done parsing suite'));
  }

}
