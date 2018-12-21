import { RequestOptsConfig } from './config/common/RequestOptsConfig';
import { deserialize } from 'json-typescript-mapper';
import { RESTTestExpect } from './RESTTestExpect';
import { RESTTestSet } from './RESTTestSet';

import * as _ from 'lodash';
import { RESTMock } from './RESTMock';

/**
 * The definition of a REST Service Test. Also defines any additional mock behavior
 * for when Busybee is running in `mock` mode.
 *
 * ```
 * {
 *   id: 'My Test',
 *   description: 'This test is used to test something',
 *   testSet: RESTTestSet[],
 *   request : RequestOptsConfig,
 *   expect: RESTTestExpect,
 *   skip: false,
 *   mocks: RESTMock[]
 * }
 * ```
 */
export class RESTTest {
  /**
   * <span style="color:red">**Required**</span> <br>
   * Unique name of the test
   */
  id: string;
  /**
   * An optional description
   */
  description: string;
  /**
   * <span style="color:red">**Required**</span> <br>
   * The TestSet that this test should run with-in. A test can run in more than one TestSet if necessary
   */
  testSet: Array<RESTTestSet> | RESTTestSet;
  /**
   * Provided in milliseconds, will instruct Busybee to wait `n` milliseconds before making the request.
   * Can be helpful when debugging potential race-conditions or simulating user-behavior
   */
  delayRequest: number;
  /**
   * <span style="color:red">**Required**</span> <br>
   * The Request that will be made to the REST Service
   */
  request: RequestOptsConfig;
  /**
   * The assertion of the response. If omitted the `mock` field must be provided for the file to have any value.
   */
  expect: RESTTestExpect;
  /**
   * If `true` this test will be skipped during parsing
   */
  skip: boolean;
  /**
   * Allows the user to provide a mock responses when busybee is running in `mock` mode. This field is required if
   * the `expect` property contains Javascript Assertion Functions instead of Javascript Objects. In `mock` mode Busybee
   * simply returns the `expect` objects as the mocked response. This will not work if you use functions and manually
   * assert responses. When more than 1 mock is supplied the mock server will iterate through the responses as requests
   * are made allowing the tester to simulate errors and inconsistent behavior.
   */
  mocks: RESTMock[];

  constructor(data: any) {
    this.id = data.id;
    this.description = data.description;
    if (data.testSet) {
      this.testSet = _.isArray(data.testSet)
        ? _.map(data.testSet, ts => {
            return new RESTTestSet(ts);
          })
        : new RESTTestSet(data.testSet);
    }
    this.request = deserialize(RequestOptsConfig, data.request);
    if (data.expect) {
      this.expect = new RESTTestExpect(data.expect);
    }
    this.skip = data.skip;

    if (data.mocks) {
      if (_.isArray(data.mocks)) {
        this.mocks = data.mocks.map(m => new RESTMock(m));
      } else {
        this.mocks = _.isEmpty(data.mocks) ? [] : [new RESTMock(data.mocks)];
      }
    }

    this.delayRequest = data.delayRequest;
  }
}
