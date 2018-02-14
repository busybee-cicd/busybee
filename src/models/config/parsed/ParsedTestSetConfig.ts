import {TestSetConfig} from "../user/TestSetConfig";
import {RESTTest} from "../../RESTTest";

export class ParsedTestSetConfig {
  id: string;
  description: string;
  data: any;
  tests: RESTTest[];
  testsUnordered: RESTTest[];

  constructor(testSetConfig: TestSetConfig) {
    this.id = testSetConfig.id;
    this.description = testSetConfig.description;
    this.data = testSetConfig.data;
    this.tests = <RESTTest []> [];
    this.testsUnordered = <RESTTest []> [];
  }
}
