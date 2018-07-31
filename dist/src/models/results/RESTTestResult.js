"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var RESTTestHeaderResult_1 = require("./RESTTestHeaderResult");
var RESTTestPartResult_1 = require("./RESTTestPartResult");
var RESTTestResult = /** @class */ (function () {
    function RESTTestResult(id) {
        this.pass = true;
        this.id = id;
        this.status = new RESTTestPartResult_1.RESTTestPartResult();
        this.headers = new RESTTestHeaderResult_1.RESTTestHeaderResult();
        this.body = new RESTTestPartResult_1.RESTTestPartResult();
    }
    return RESTTestResult;
}());
exports.RESTTestResult = RESTTestResult;
//# sourceMappingURL=RESTTestResult.js.map