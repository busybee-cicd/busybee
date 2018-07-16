"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var RequestOptsConfig_1 = require("./config/common/RequestOptsConfig");
var json_typescript_mapper_1 = require("json-typescript-mapper");
var RESTTestExpect_1 = require("./RESTTestExpect");
var RESTTestSet_1 = require("./RESTTestSet");
var _ = require("lodash");
var RESTMock_1 = require("./RESTMock");
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
 *   mock: RESTMock
 * }
 * ```
 */
var RESTTest = /** @class */ (function () {
    function RESTTest(data) {
        this.id = data.id;
        this.description = data.description;
        if (data.testSet) {
            this.testSet = _.isArray(data.testSet) ? _.map(data.testSet, function (ts) { return new RESTTestSet_1.RESTTestSet(ts); }) : new RESTTestSet_1.RESTTestSet(data.testSet);
        }
        this.request = json_typescript_mapper_1.deserialize(RequestOptsConfig_1.RequestOptsConfig, data.request);
        if (data.expect) {
            this.expect = new RESTTestExpect_1.RESTTestExpect(data.expect);
        }
        this.skip = data.skip;
        this.mock = new RESTMock_1.RESTMock(data.mock);
        this.delayRequest = data.delayRequest;
    }
    return RESTTest;
}());
exports.RESTTest = RESTTest;
//# sourceMappingURL=RESTTest.js.map