"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ParsedTestSetConfig = /** @class */ (function () {
    function ParsedTestSetConfig(testSetConfig) {
        this.id = testSetConfig.id;
        this.controlFlow = testSetConfig.controlFlow;
        this.description = testSetConfig.description;
        this.runData = testSetConfig.runData;
        this.tests = [];
        this.testsUnordered = [];
        this.variableExports = {};
    }
    return ParsedTestSetConfig;
}());
exports.ParsedTestSetConfig = ParsedTestSetConfig;
//# sourceMappingURL=ParsedTestSetConfig.js.map