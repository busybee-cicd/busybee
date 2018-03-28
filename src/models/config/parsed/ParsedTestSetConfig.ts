import {TestSetConfig} from "../user/TestSetConfig";
import {RESTTest} from "../../RESTTest";

export class ParsedTestSetConfig {
  id: string;
  controlFlow: string;
  description: string;
  data: any;
  tests: RESTTest[];
  testsUnordered: RESTTest[];
  variableExports: any; // holds vars exported from tests so that they can be used in other tests

  constructor(testSetConfig: TestSetConfig) {
    this.id = testSetConfig.id;
    this.controlFlow = testSetConfig.controlFlow;
    this.description = testSetConfig.description;
    this.data = testSetConfig.data;
    this.tests = <RESTTest []> [];
    this.testsUnordered = <RESTTest []> [];
    this.variableExports = {};
  }
}
