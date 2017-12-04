import {RequestOptsConfig} from "../common/RequestOptsConfig";
import {deserialize} from 'json-typescript-mapper';
import {ResponseBody} from "../common/ResponseBody";

export class RESTTest {
    name: string;
    description: string;
    testSet: any;
    request: RequestOptsConfig;
    expect: any;
    skip: boolean;
    mockResponse: ResponseBody;
    testIndex: number;

    constructor(data: any) {
        this.name = data.name;
        this.description = data.description;
        this.testSet = data.testSet;
        this.request = deserialize(RequestOptsConfig, data.request);
        this.expect = data.expect;
        this.skip = data.skip;
        this.mockResponse = deserialize(ResponseBody, data.mockResponse);
        this.testIndex = data.testIndex;
    }
}