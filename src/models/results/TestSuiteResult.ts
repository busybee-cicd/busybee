import {TestSetResult} from "./TestSetResult";
import { TestSuiteResultSummary } from "./TestSuiteResultSummary";
import { EnvResult } from "./EnvResult";
import * as _ from 'lodash';

export class TestSuiteResult {

  id: string;
  type: string;
  testSets: Array<TestSetResult> = [];
  pass: boolean = true;
  summary: TestSuiteResultSummary = new TestSuiteResultSummary();

  constructor(id: string, type: string, testSets: Array<TestSetResult>, pass: boolean) {
    this.id = id;
    this.type = type;
    this.pass = pass

    this.addTestSets(testSets);
  }

  addEnvResult(envResult: EnvResult) {
    this.addTestSets(envResult.testSets);
  }

  addTestSets(newTestSets: Array<TestSetResult>) {
    // update the summary and add the testSetResults to the testSets collection
    for (let tsResult of newTestSets) {
      this.summary.numberOfTestSets += 1;
      this.testSets.push(tsResult);
      if (!tsResult.pass) {
        this.pass = false;
      }

      // if type is REST then track individual test stats (for now)
      if (this.type === "REST") {
        this.summary.numberOfTests += tsResult.tests.length;

        if (tsResult.pass) {
          // if the ts is marked as pass then all of the tests passed too
          this.summary.numberOfPassedTests += tsResult.tests.length;
        } else {
          let passedTests = _.filter(tsResult.tests, (t) => { return t.pass === true; })
          this.summary.numberOfPassedTests += passedTests.length;
        }
      }
    }
  }
}
