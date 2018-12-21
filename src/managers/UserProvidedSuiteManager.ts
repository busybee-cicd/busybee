import * as _ from 'lodash';
import * as path from 'path';
import { Logger, LoggerConf } from 'busybee-util';
import { EnvManager } from './EnvManager';
import { ParsedTestSetConfig } from '../models/config/parsed/ParsedTestSetConfig';
import { SuiteEnvInfo } from '../lib/SuiteEnvInfo';
import { BusybeeParsedConfig } from '../models/config/BusybeeParsedConfig';
import { TestSetResult } from '../models/results/TestSetResult';

export class UserProvidedSuiteManager {
  private conf: BusybeeParsedConfig;
  private suiteEnvConf: SuiteEnvInfo;
  private envManager: EnvManager;
  private logger: Logger;

  constructor(
    conf: BusybeeParsedConfig,
    suiteEnvConf: SuiteEnvInfo,
    envManager: EnvManager
  ) {
    this.conf = _.cloneDeep(conf);
    this.suiteEnvConf = suiteEnvConf;
    this.envManager = envManager;
    const loggerConf = new LoggerConf(this, conf.logLevel, null);
    this.logger = new Logger(loggerConf);
  }

  buildUrl(port) {
    this.logger.trace(`buildUrl ${port}`);
    let protocol = this.suiteEnvConf.protocol;
    let hostName = this.suiteEnvConf.hostName;

    let url = `${protocol}://${hostName}`;
    if (port) {
      url += `:${port}`;
    }

    return url;
  }

  async runTestSets(generatedEnvID): Promise<Array<TestSetResult>> {
    this.logger.trace(
      `runTestSets ${this.suiteEnvConf.suiteID} ${this.suiteEnvConf.suiteEnvID}`
    );
    this.logger.trace(this.suiteEnvConf, true);
    let testSetPromises = this.suiteEnvConf.testSets.values().map(testSet => {
      return this.runTestSet(testSet, generatedEnvID);
    });

    try {
      return await Promise.all(testSetPromises);
    } catch (e) {
      this.logger.trace(
        `runTestSets ERROR encountered while running testSetPromises`
      );
      throw e;
    }
  }

  async runTestSet(
    testSet: ParsedTestSetConfig,
    generatedEnvID: string
  ): Promise<TestSetResult> {
    this.logger.trace(
      `runTestSet | ${this.suiteEnvConf.suiteID} | ${
        this.suiteEnvConf.suiteEnvID
      } | ${testSet.id}`
    );
    this.logger.trace(testSet, true);

    let testSetResult = new TestSetResult();
    testSetResult.id = testSet.id;
    testSetResult.pass = true;
    try {
      // run the script via envManager. A script that writes to STDERR will be considered a TestSet failure.
      let busybeeDir = this.conf.filePaths.busybeeDir;
      let scriptPath = path.join(busybeeDir, this.suiteEnvConf.runScript);

      let args = {
        generatedEnvID: generatedEnvID,
        protocol: this.suiteEnvConf.protocol,
        hostName: this.suiteEnvConf.hostName,
        ports: this.suiteEnvConf.ports,
        busybeeDir: busybeeDir,
        runData: testSet.runData
      };

      let returnData = await this.envManager.runScript(scriptPath, [
        JSON.stringify(args)
      ]);
      if (testSet.assertion) {
        try {
          // assertion() must explicity return false OR throw an Error to be considered failed
          let assertionResult = testSet.assertion(returnData);
          if (assertionResult === false) {
            testSetResult.pass = false;
          }
        } catch (e) {
          testSetResult.pass = false;
          testSetResult.error = e;
        }
      }
    } catch (e) {
      testSetResult.pass = false;
      testSetResult.error = e;
    }

    return testSetResult;
  }
}
