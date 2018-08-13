import {ParsedTestSetConfig} from "./ParsedTestSetConfig";
import {TypedMap} from "../../../lib/TypedMap";
import {EnvInstanceConfig} from "../user/EnvInstanceConfig";

export class ParsedTestEnvConfig {
  suiteEnvID: string;
  testSets: TypedMap<ParsedTestSetConfig>;
  startData: any;
  stopData: any;
  retries: number = 0;

  constructor(config: EnvInstanceConfig) {
    this.testSets = new TypedMap<ParsedTestSetConfig>();
    if (config) {
      this.suiteEnvID = config.id;
      this.startData = config.startData;
      this.stopData = config.stopData;
    }
  }
}
