import {TestSetConfig} from "../user/TestSetConfig";

export class ParsedTestSetConfig {
  id: string;
  data: any;
  tests: Object[];

  constructor(testSetConfig: TestSetConfig) {
    this.id = testSetConfig.id;
    this.data = testSetConfig.data;
    this.tests = <Object []> [];
  }
}
