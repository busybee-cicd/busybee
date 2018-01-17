"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var KeyIdentifier_1 = require("./KeyIdentifier");
var _ = require("lodash");
var UnorderedCollections = /** @class */ (function () {
    function UnorderedCollections() {
    }
    UnorderedCollections.process = function (config, expected, actual) {
        try {
            KeyIdentifier_1.KeyIdentifier.process(config, expected, actual, function (currentKey, _expected, _actual) {
                // compare the 2 collections
                var expectedCol = currentKey === '.' ? _expected : _expected[currentKey];
                var actualCol = currentKey === '.' ? _actual : _actual[currentKey];
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
                if (currentKey === '.') {
                    _expected.length = 0;
                    _actual.length = 0;
                }
                else {
                    delete _expected[currentKey];
                    delete _actual[currentKey];
                }
            });
        }
        catch (e) {
            throw e;
            // throw new Error(`Error encountered while applying your 'assertionModifications.unorderedCollection'. Please confirm 'assertionModifications.unorderedCollection' is formatted correctly`)
        }
    };
    return UnorderedCollections;
}());
exports.UnorderedCollections = UnorderedCollections;
//# sourceMappingURL=UnorderedCollections.js.map