import {TestSetResult} from "./TestSetResult";
export class TestSuiteResult {

    id: string;
    type: string;
    testSets: Array<TestSetResult>
    pass: boolean;


    constructor() {
    }

}
