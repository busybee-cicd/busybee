import {TestSetConfig} from "../user/TestSetConfig";
import {RESTTest} from "../test/RESTTest";

export class ParsedTestSetConfig {
  id: string;
  description: string;
  data: any;
  tests: RESTTest[];

  constructor(testSetConfig: TestSetConfig) {
    this.id = testSetConfig.id;
    this.description = testSetConfig.description;
    this.data = testSetConfig.data;
    this.tests = <RESTTest []> [];
  }
}
