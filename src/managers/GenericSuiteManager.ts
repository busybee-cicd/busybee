import * as _ from 'lodash';
import * as path from 'path';
import {Logger} from '../lib/Logger';
import {EnvManager} from "./EnvManager";
import {ParsedTestSetConfig} from "../models/config/parsed/ParsedTestSetConfig";
import {SuiteEnvInfo} from "../lib/SuiteEnvInfo";
import {BusybeeParsedConfig} from "../models/config/BusybeeParsedConfig";

export class GenericSuiteManager {

  private conf: BusybeeParsedConfig;
  private suiteEnvConf: SuiteEnvInfo;
  private envManager: EnvManager;
  private logger: Logger;

  constructor(conf: BusybeeParsedConfig, suiteEnvConf: SuiteEnvInfo, envManager: EnvManager) {
    this.conf = _.cloneDeep(conf);
    this.suiteEnvConf = suiteEnvConf;
    this.envManager = envManager;
    this.logger = new Logger(conf, this);
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

  runTestSets(generatedEnvID) {
    // TODO: logic for running TestSets in order
    return new Promise(async(resolve, reject) => {
      this.logger.trace(`runTestSets ${this.suiteEnvConf.suiteID} ${this.suiteEnvConf.suiteEnvID}`);
      this.logger.trace(this.suiteEnvConf, true);
      let testSetPromises = this.suiteEnvConf.testSets.values().map((testSet) => {
        return this.runTestSet(testSet, generatedEnvID);
      });

      let testSetResults;
      let testSetErr;
      try {
        testSetResults = await Promise.all(testSetPromises);
      } catch (e) {
        testSetErr = e;
      }

      if (testSetErr) {
        this.logger.trace(`runTestSets ERROR encountered while running testSetPromises`);
        reject(testSetErr);
      } else {
        resolve(testSetResults);
      }
    });

  }

  async runTestSet(testSet: ParsedTestSetConfig, generatedEnvID: string) {
    this.logger.trace(`runTestSet | ${this.suiteEnvConf.suiteID} | ${this.suiteEnvConf.suiteEnvID} | ${testSet.id}`);
    this.logger.trace(testSet, true);
    // run the script via envManager
    let busybeeDir = this.conf.filePaths.busybeeDir;
    let scriptPath = path.join(busybeeDir, this.suiteEnvConf.runScript);

    let args = {
      generatedEnvID: generatedEnvID,
      protocol: this.suiteEnvConf.protocol,
      hostName: this.suiteEnvConf.hostName,
      ports: this.suiteEnvConf.ports,
      busybeeDir: busybeeDir,
      data: testSet.data
    };

    return this.envManager.runScript(scriptPath, [JSON.stringify(args)]);
  }

}
