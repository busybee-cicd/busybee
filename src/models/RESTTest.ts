import {RequestOptsConfig} from "./config/common/RequestOptsConfig";
import {deserialize} from 'json-typescript-mapper';
import {RESTTestExpect} from "./RESTTestExpect";
import {RESTTestSet} from './RESTTestSet';

import * as _ from 'lodash';
import { RESTMock } from "./RESTMock";

export class RESTTest {
  id: string;
  description: string;
  testSet: Array<RESTTestSet> | RESTTestSet;
  delayRequest: number;
  request: RequestOptsConfig;
  expect: RESTTestExpect;
  skip: boolean;
  mock: RESTMock;

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
    this.mock = new RESTMock(data.mock);
    this.delayRequest = data.delayRequest;
  }
}
