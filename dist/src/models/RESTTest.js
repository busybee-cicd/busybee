"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var RequestOptsConfig_1 = require("./config/common/RequestOptsConfig");
var json_typescript_mapper_1 = require("json-typescript-mapper");
var ResponseBody_1 = require("./ResponseBody");
var RESTTestExpect_1 = require("./RESTTestExpect");
var RESTTest = /** @class */ (function () {
    function RESTTest(data) {
        this.id = data.id;
        this.description = data.description;
        this.testSet = data.testSet;
        this.request = json_typescript_mapper_1.deserialize(RequestOptsConfig_1.RequestOptsConfig, data.request);
        if (data.expect) {
            this.expect = new RESTTestExpect_1.RESTTestExpect(data.expect);
        }
        this.skip = data.skip;
        this.mockResponse = json_typescript_mapper_1.deserialize(ResponseBody_1.ResponseBody, data.mockResponse);
        this.testIndex = data.testIndex;
    }
    return RESTTest;
}());
exports.RESTTest = RESTTest;
//# sourceMappingURL=RESTTest.js.map