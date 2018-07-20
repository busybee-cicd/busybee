import { ConfigParser } from  '../../../src/lib/ConfigParser';
import { BusybeeParsedConfig } from '../../../src/models/config';
import { RESTSuiteManager } from '../../../src/managers/RESTSuiteManager';
import { ParsedTestSuite } from '../../../src/models/config/parsed/ParsedTestSuiteConfig';
import { SuiteEnvInfo } from '../../../src/lib/SuiteEnvInfo';
import * as path from 'path';

const unitTestSrcDir = '../../../../test/unit';
export class UnitUtil {

  static getBusybeeParsedConfig(): BusybeeParsedConfig {
    let confPath = path.join(__dirname, unitTestSrcDir, 'util');
    let configParser = new ConfigParser({directory: confPath});
    return configParser.parse('test');
  }

  static getRESTSuiteManager(config: BusybeeParsedConfig): RESTSuiteManager {
    const parsedTs:ParsedTestSuite = config.parsedTestSuites.values()[0];
    const suiteEnvId = parsedTs.testEnvs.values()[0].suiteEnvID;
    const envInfo:SuiteEnvInfo = new SuiteEnvInfo(parsedTs, suiteEnvId, 100, 'localhost');

    return new RESTSuiteManager(config, envInfo);
  }

}
