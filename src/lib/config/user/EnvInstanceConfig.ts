import {TestSetConfig} from "./TestSetConfig";
export class EnvInstanceConfig {
  id: string
  testSets: TestSetConfig[];
  suiteEnvID: string;

  constructor() {
    this.id = void 0;
    this.testSets = void 0;
  }
}
