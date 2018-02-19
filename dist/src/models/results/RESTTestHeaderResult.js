"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var RESTTestHeaderResult = /** @class */ (function () {
    function RESTTestHeaderResult(headerName, pass, actual, expected) {
        if (pass === void 0) { pass = true; }
        this.headerName = headerName;
        this.pass = pass;
        this.actual = actual ? actual : this.actual;
        this.expected = expected ? expected : this.expected;
    }
    return RESTTestHeaderResult;
}());
exports.RESTTestHeaderResult = RESTTestHeaderResult;
//# sourceMappingURL=RESTTestHeaderResult.js.map