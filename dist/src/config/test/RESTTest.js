"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var RequestOptsConfig_1 = require("../common/RequestOptsConfig");
var json_typescript_mapper_1 = require("json-typescript-mapper");
var ResponseBody_1 = require("../common/ResponseBody");
var RESTTest = /** @class */ (function () {
    function RESTTest(data) {
        this.name = data.name;
        this.description = data.description;
        this.testSet = data.testSet;
        this.request = json_typescript_mapper_1.deserialize(RequestOptsConfig_1.RequestOptsConfig, data.request);
        this.expect = data.expect;
        this.skip = data.skip;
        this.mockResponse = json_typescript_mapper_1.deserialize(ResponseBody_1.ResponseBody, data.mockResponse);
        this.testIndex = data.testIndex;
    }
    return RESTTest;
}());
exports.RESTTest = RESTTest;
//# sourceMappingURL=RESTTest.js.map