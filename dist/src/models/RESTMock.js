"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var json_typescript_mapper_1 = require("json-typescript-mapper");
var ResponseBody_1 = require("./ResponseBody");
var RESTMock = /** @class */ (function () {
    function RESTMock(data) {
        if (!data) {
            return;
        }
        this.response = json_typescript_mapper_1.deserialize(ResponseBody_1.ResponseBody, data.response);
        this.lag = data.lag;
    }
    return RESTMock;
}());
exports.RESTMock = RESTMock;
//# sourceMappingURL=RESTMock.js.map