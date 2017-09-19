import {ParsedTestSetConfig} from "./ParsedTestSetConfig";
import {TypedMap} from "../../TypedMap";
export class ParsedTestEnvConfig {
  suiteEnvID: string;
  testSets: TypedMap<ParsedTestSetConfig>;

  constructor() {
    this.testSets = new TypedMap<ParsedTestSetConfig>();
  }
}
