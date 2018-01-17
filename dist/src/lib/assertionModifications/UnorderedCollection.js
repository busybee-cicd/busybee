"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var KeyIdentifier_1 = require("./KeyIdentifier");
var _ = require("lodash");
var UnorderedCollection = /** @class */ (function () {
    function UnorderedCollection() {
    }
    UnorderedCollection.process = function (config, expected, actual) {
        try {
            KeyIdentifier_1.KeyIdentifier.process(config, expected, actual, function (currentKey, expected, actual) {
                // compare the 2 collections
                var expectedCol = expected[currentKey];
                var actualCol = actual[currentKey];
                // check length.
                if (expectedCol.length != actualCol.length) {
                    throw new Error("The collections at '" + currentKey + "' are not of equal length. Expected == " + expectedCol.length + ", Actual == " + expectedCol.length);
                }
                expectedCol.forEach(function (expectedItem) {
                    var result = _.find(actualCol, function (actualItem) {
                        return _.isEqual(expectedItem, actualItem);
                    });
                    if (!result) {
                        throw new Error("The collections at '" + currentKey + "' are not equal");
                    }
                });
                // remove these collections once they've been confirmed to be equal.
                delete expected[currentKey];
                delete actual[currentKey];
            });
        }
        catch (e) {
            throw new Error("Error encountered while applying your 'assertionModifications.unorderedCollection'. Please confirm 'assertionModifications.unorderedCollection' is formatted correctly");
        }
    };
    return UnorderedCollection;
}());
exports.UnorderedCollection = UnorderedCollection;
//# sourceMappingURL=UnorderedCollection.js.map