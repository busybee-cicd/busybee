import {TestSetResult} from "./TestSetResult";
export class EnvResult {

  suiteID: string;
  type: string;
  env: string;
  testSets: Array<TestSetResult>;
  error: Error;

  constructor() {

  }

  static new(type: string, suiteID: string, suiteEnvID: string): EnvResult {
    let res = new this();
    res.type = type;
    res.suiteID = suiteID;
    res.env = suiteEnvID;

    return res;
  }

}
