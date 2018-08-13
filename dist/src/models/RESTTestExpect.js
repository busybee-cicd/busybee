"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var RESTTestAssertionModifications_1 = require("./RESTTestAssertionModifications");
var RESTTestExpect = /** @class */ (function () {
    function RESTTestExpect(data) {
        this.status = data.status;
        this.headers = data.headers;
        this.body = data.body;
        if (data.assertionModifications) {
            this.assertionModifications = new RESTTestAssertionModifications_1.RESTTestAssertionModifications(data.assertionModifications);
        }
    }
    return RESTTestExpect;
}());
exports.RESTTestExpect = RESTTestExpect;
//# sourceMappingURL=RESTTestExpect.js.map