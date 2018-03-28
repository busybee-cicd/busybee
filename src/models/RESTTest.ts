import {RequestOptsConfig} from "./config/common/RequestOptsConfig";
import {deserialize} from 'json-typescript-mapper';
import {ResponseBody} from "./ResponseBody";
import {RESTTestExpect} from "./RESTTestExpect";
import {RESTTestSet} from './RESTTestSet';

import * as _ from 'lodash';

export class RESTTest {
  id: string;
  description: string;
  testSet: Array<RESTTestSet> | RESTTestSet;
  request: RequestOptsConfig;
  expect: RESTTestExpect;
  skip: boolean;
  mockResponse: ResponseBody;
  delayTestRequest: number;
  delayMockedResponse: number;

  constructor(data: any) {
    this.id = data.id;
    this.description = data.description;
    if (data.testSet) {
      this.testSet = _.isArray(data.testSet) ? _.map(data.testSet, (ts) => { return new RESTTestSet(ts); }) : new RESTTestSet(data.testSet);
    }
    this.request = deserialize(RequestOptsConfig, data.request);
    if (data.expect) {
      this.expect = new RESTTestExpect(data.expect);
    }
    this.skip = data.skip;
    this.mockResponse = deserialize(ResponseBody, data.mockResponse);
    this.delayTestRequest = data.delayTestRequest;
    this.delayMockedResponse = data.mockResponseDelay;
  }
}
