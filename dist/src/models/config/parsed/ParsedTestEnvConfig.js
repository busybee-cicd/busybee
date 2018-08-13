"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var TypedMap_1 = require("../../../lib/TypedMap");
var ParsedTestEnvConfig = /** @class */ (function () {
    function ParsedTestEnvConfig(config) {
        this.retries = 0;
        this.testSets = new TypedMap_1.TypedMap();
        if (config) {
            this.suiteEnvID = config.id;
            this.startData = config.startData;
            this.stopData = config.stopData;
        }
    }
    return ParsedTestEnvConfig;
}());
exports.ParsedTestEnvConfig = ParsedTestEnvConfig;
//# sourceMappingURL=ParsedTestEnvConfig.js.map