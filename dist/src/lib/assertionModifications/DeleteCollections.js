"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var KeyIdentifier_1 = require("./KeyIdentifier");
var DeleteCollections = /** @class */ (function () {
    function DeleteCollections() {
    }
    DeleteCollections.process = function (config, expected, actual) {
        try {
            KeyIdentifier_1.KeyIdentifier.process(config, expected, actual, function (currentKey, _expected, _actual) {
                // compare the 2 collections
                var expectedCol = currentKey === '.' ? _expected : _expected[currentKey];
                var actualCol = currentKey === '.' ? _actual : _actual[currentKey];
                if (currentKey === '.') {
                    _expected.length = 0;
                    _actual.length = 0;
                }
                else {
                    _expected[currentKey].length = 0;
                    _actual[currentKey].length = 0;
                    // delete _expected[currentKey];
                    // delete _actual[currentKey];
                }
            });
        }
        catch (e) {
            throw e;
            // throw new Error(`Error encountered while applying your 'assertionModifications.unorderedCollection'. Please confirm 'assertionModifications.unorderedCollection' is formatted correctly`)
        }
    };
    return DeleteCollections;
}());
exports.DeleteCollections = DeleteCollections;
//# sourceMappingURL=DeleteCollections.js.map