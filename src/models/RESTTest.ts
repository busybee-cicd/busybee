import {RequestOptsConfig} from "./config/common/RequestOptsConfig";
import {deserialize} from 'json-typescript-mapper';
import {ResponseBody} from "./ResponseBody";

export class RESTTest {
    id: string;
    description: string;
    testSet: any;
    request: RequestOptsConfig;
    expect: any;
    skip: boolean;
    mockResponse: ResponseBody;
    testIndex: number;

    constructor(data: any) {
        this.id = data.id;
        this.description = data.description;
        this.testSet = data.testSet;
        this.request = deserialize(RequestOptsConfig, data.request);
        this.expect = data.expect;
        this.skip = data.skip;
        this.mockResponse = deserialize(ResponseBody, data.mockResponse);
        this.testIndex = data.testIndex;
    }
}