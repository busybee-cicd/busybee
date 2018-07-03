import {TestSetConfig} from "./TestSetConfig";
export class EnvInstanceConfig {
  id: string
  testSets: TestSetConfig[];
  suiteEnvID: string;
  startData: any;
  stopData: any;

  constructor() {
    this.id = void 0;
    this.testSets = void 0;
    this.startData = void 0;
    this.stopData = void 0;
  }
}
