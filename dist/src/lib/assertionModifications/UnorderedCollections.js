"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var KeyIdentifier_1 = require("./KeyIdentifier");
var _ = require("lodash");
/*
    Will only check that the collections specified are equal. Any child collections are ignored during the equality check.
    However, the collections tested ARE ordered as a result of the testing and therefor any child collections can be
    tested for equality further down the road.
    ie) if the config is ['*', '*.collection'] then the first iteration is dealing with '*'
    EXPECTED
    [
        {
          id: 1,
          collection: [a,b,c]
        },
        {
          id: 2,
          collection [d,e,f]
        }
    ]

    ACTUAL
    [
         {
             id: 2,
             collection [f,e,d]
         },
        {
            id: 1,
            collection: [c,b,a]
        },

    ]

    becomes

     EXPECTED
     [
         {
             id: 1,
             collection: [a,b,c]
         },
         {
             id: 2,
             collection [d,e,f]
         }
     ]

     ACTUAL
     [
         {
             id: 1,
             collection: [c,b,a]
         },
             {
             id: 2,
             collection [f,e,d]
         }
     ]

    Now that the outter-most collection has been deemed equal (not including child collections) and re-ordered
    so that EXEPECTED and ACTUAL are in the same order. On the next iteration when we're dealing with '*.collection'
    the 'collection' key enters the iteration with the 'collections' matched

    EXPECTED
        collection: [a,b,c]

    ACTUAL
        collection: [c,b,a]

    Next iteration

    EXPECTED
        collection [d,e,f]
    ACTUAL
        collection [f,e,d]

 */
var UnorderedCollections = /** @class */ (function () {
    function UnorderedCollections() {
    }
    UnorderedCollections.process = function (config, expected, actual) {
        KeyIdentifier_1.KeyIdentifier.process(config, expected, actual, function (currentKey, _expected, _actual) {
            // compare the 2 collections
            var expectedCol;
            var actualCol;
            if (_expected[currentKey]) {
                expectedCol = _expected[currentKey];
                actualCol = _actual[currentKey];
            }
            else if (currentKey == '*' || (_.isArray(_expected) && _.isArray(_actual))) {
                expectedCol = _expected;
                actualCol = _actual;
            }
            if (!expectedCol && !actualCol) {
                // if we can't find the key then we assume that it may be null OR omitted
                // this can happen if they reference something deeply nested that isn't required. don't throw an error, just bail
                return;
            }
            // check length.
            if (expectedCol.length != actualCol.length) {
                throw new Error("The collections at '" + currentKey + "' are not of equal length. Expected == " + expectedCol.length + ", Actual == " + expectedCol.length);
            }
            UnorderedCollections.testEqualityOfCollections(expectedCol, actualCol, currentKey);
        });
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
                // 2. remove any child collections (we wont take these into account for equality check)
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
                throw new Error("The collections at '" + currentKey + "' are not equal OR the parent object is a member of an ambiguous collection");
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