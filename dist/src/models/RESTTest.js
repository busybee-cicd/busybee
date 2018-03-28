"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var RequestOptsConfig_1 = require("./config/common/RequestOptsConfig");
var json_typescript_mapper_1 = require("json-typescript-mapper");
var ResponseBody_1 = require("./ResponseBody");
var RESTTestExpect_1 = require("./RESTTestExpect");
var RESTTestSet_1 = require("./RESTTestSet");
var _ = require("lodash");
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
        this.mockResponse = json_typescript_mapper_1.deserialize(ResponseBody_1.ResponseBody, data.mockResponse);
        this.delayTestRequest = data.delayTestRequest;
        this.delayMockedResponse = data.mockResponseDelay;
    }
    return RESTTest;
}());
exports.RESTTest = RESTTest;
//# sourceMappingURL=RESTTest.js.map