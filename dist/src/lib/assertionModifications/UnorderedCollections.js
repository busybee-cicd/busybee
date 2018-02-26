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
                var expectedCol;
                var actualCol;
                if (_expected[currentKey]) {
                    expectedCol = _expected[currentKey];
                    actualCol = _actual[currentKey];
                }
                else if (currentKey == '*' || _.isArray(_expected)) {
                    expectedCol = _expected;
                    actualCol = _actual;
                }
                if (!expectedCol && !actualCol) {
                    throw new Error("The collection at '" + currentKey + "' cannot be found. It's possible that this collection is nested under an unorderedCollection that has already been asserted or that the collection simply does not exist.");
                }
                // check length.
                if (expectedCol.length != actualCol.length) {
                    throw new Error("The collections at '" + currentKey + "' are not of equal length. Expected == " + expectedCol.length + ", Actual == " + expectedCol.length);
                }
                UnorderedCollections.testEqualityOfCollections(expectedCol, actualCol, currentKey);
            });
        }
        catch (e) {
            throw e;
            // throw new Error(`Error encountered while applying your 'assertionModifications.unorderedCollection'. Please confirm 'assertionModifications.unorderedCollection' is formatted correctly`)
        }
    };
    UnorderedCollections.testEqualityOfCollections = function (expected, actual, currentKey) {
        if (expected.length != actual.length) {
            throw new Error("The collections at '" + currentKey + "' are not of equal length. Expected == " + expected.length + ", Actual == " + actual.length);
        }
        var expectedOrdered = [];
        var actualOrdered = [];
        expected.forEach(function (expectedItem) {
            var result = _.find(actual, function (actualItem) {
                ////////
                // We don't support {'hello': [[1],[2,3],[4]]}
                ///////
                if (_.isArray(actualItem)) {
                    throw new Error("Sorry, assertionModifications.unorderedCollection doesn't support collections directly nested in collections at this. ie) {'hello': [[1],[2,3],[4]]}");
                }
                ;
                // 1. make copy. if what we're comparing is an array of arrays we just set to null because we're not going to support this;
                var expectedItemWithCollsRemoved = _.isObject(expectedItem) ? Object.assign({}, expectedItem) : expectedItem;
                var actualItemWithCollsRemoved = _.isObject(actualItem) ? Object.assign({}, actualItem) : actualItem;
                // 2. remove any child collections
                if (_.isObject(expectedItemWithCollsRemoved)) {
                    if (UnorderedCollections.hasChildCollections(expectedItemWithCollsRemoved)
                        || UnorderedCollections.hasChildCollections(actualItemWithCollsRemoved)) {
                        UnorderedCollections.deleteCollectionsFromObj(expectedItemWithCollsRemoved);
                        UnorderedCollections.deleteCollectionsFromObj(actualItemWithCollsRemoved);
                    }
                }
                // 3. test that our items, minus any collections, are equal
                var itemsAreEqual = _.isEqual(expectedItemWithCollsRemoved, actualItemWithCollsRemoved);
                if (itemsAreEqual) {
                    expectedOrdered.push(expectedItem);
                    actualOrdered.push(actualItem);
                }
                return itemsAreEqual;
            });
            if (!result) {
                throw new Error("The collections at '" + currentKey + "' are not equal");
            }
        });
        actual.splice.apply(actual, [0, actual.length].concat(actualOrdered));
        expected.splice.apply(expected, [0, expected.length].concat(expectedOrdered));
    };
    UnorderedCollections.hasChildCollections = function (obj) {
        var ret = false;
        _.forEach(obj, function (v, k) {
            if (_.isArray(v)) {
                ret = true;
                return false;
            }
        });
        return ret;
    };
    UnorderedCollections.deleteCollectionsFromObj = function (obj) {
        _.forEach(obj, function (v, k) {
            if (_.isArray(v)) {
                delete obj[k];
            }
        });
    };
    return UnorderedCollections;
}());
exports.UnorderedCollections = UnorderedCollections;
//# sourceMappingURL=UnorderedCollections.js.map