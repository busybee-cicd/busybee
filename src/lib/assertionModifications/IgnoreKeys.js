"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var KeyIdentifier_1 = require("./KeyIdentifier");
var IgnoreKeys = /** @class */ (function () {
    function IgnoreKeys() {
    }
    IgnoreKeys.process = function (config, expected, actual, logger) {
        if (logger === void 0) { logger = null; }
        try {
            KeyIdentifier_1.KeyIdentifier.process(config, expected, actual, function (currentKey, expected, actual) {
                delete expected[currentKey];
                delete actual[currentKey];
            });
        }
        catch (e) {
            if (logger) {
                logger.debug(e, true);
            }
            throw new Error("Error encountered while applying 'ignoreKeys'. Please confirm 'ignoreKeys' is formatted correctly");
        }
    };
    return IgnoreKeys;
}());
exports.IgnoreKeys = IgnoreKeys;
//# sourceMappingURL=IgnoreKeys.js.map