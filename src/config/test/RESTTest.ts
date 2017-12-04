import {RequestOptsConfig} from "../common/RequestOptsConfig";
import {deserialize} from 'json-typescript-mapper';

export class RESTTest {
    name: string;
    description;
    testSet: any;
    request: RequestOptsConfig;
    expect: any;
    skip: boolean;
    mock: boolean;
    testIndex: number;

    constructor(data: any) {
        this.name = data.name;
        this.description = data.description;
        this.testSet = data.testSet;
        this.request = deserialize(RequestOptsConfig, data.request);
        this.expect = data.expect;
        this.skip = data.skip;
        this.mock = data.mock;
        this.testIndex = data.testIndex;
    }
}