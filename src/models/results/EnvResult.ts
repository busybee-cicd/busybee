import {TestSetResult} from "./TestSetResult";
export class EnvResult {

    suiteID: string;
    type: string;
    env: string;
    testSets: Array<TestSetResult>;

    constructor() {

    }

}
