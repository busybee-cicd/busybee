"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var IgnoreKeys = /** @class */ (function () {
    function IgnoreKeys() {
    }
    IgnoreKeys.process = function (ignore, expected, actual) {
        // parse the ignore payload
        ignore.forEach(function (ignoreItem) {
            if (_.isObject(ignoreItem) && !_.isArray(ignoreItem)) {
                IgnoreKeys.parseIgnoreObject(ignoreItem, expected, actual);
            }
            else if (_.isString(ignoreItem)) {
                IgnoreKeys.parseIgnoreString(ignoreItem, expected, actual);
            }
        });
        return { expected: expected, actual: actual };
    };
    /*
        Called when the initial process() method encounters an Object
     */
    IgnoreKeys.parseIgnoreObject = function (ignoreObj, expected, actual) {
        _.forEach(ignoreObj, function (v, k) {
            // first split the key to see if we need to traverse further before deleting anything
            var keyArray = k.split(".");
            if (keyArray.length > 1) {
                // we need to dive deeper..this key describes further nesting ie) key.childKey.grandChild.key
                IgnoreKeys.parseIgnoreObjectPathString(k, v, expected, actual);
                return;
            }
            if (_.isArray(v)) {
                v.forEach(function (keyToRemove) {
                    // keyToRemove could be a string or an object
                    if (_.isObject(keyToRemove) && !_.isArray(keyToRemove)) {
                        // advance the expected/actual and pass in the keyToRemove (ignoreObj)
                        var nextExpected = expected[k];
                        var nextActual_1 = actual[k];
                        if (IgnoreKeys.valueIsArray(nextExpected, nextActual_1)) {
                            nextExpected.forEach(function (_nextExpected, i) {
                                IgnoreKeys.parseIgnoreObject(keyToRemove, _nextExpected, nextActual_1[i]);
                            });
                        }
                        else {
                            IgnoreKeys.parseIgnoreObject(keyToRemove, nextExpected, nextActual_1);
                        }
                    }
                    else {
                        IgnoreKeys.advanceAndRemoveKey(k, keyToRemove, expected, actual);
                    }
                });
            }
            else if (_.isObject(v)) {
                var nextExpected = expected[k];
                var nextActual = actual[k];
                if (IgnoreKeys.valueIsArray(nextExpected, nextActual)) {
                    nextExpected.forEach(function (_nextExpected, i) {
                        IgnoreKeys.parseIgnoreObject(v, _nextExpected, actual[i]);
                    });
                }
                else {
                    IgnoreKeys.parseIgnoreObject(v, nextExpected, nextActual);
                }
            }
            else if (_.isString(v)) {
                IgnoreKeys.advanceAndRemoveKey(k, v, expected, actual);
            }
        });
    };
    IgnoreKeys.advanceAndRemoveKey = function (advanceKey, keyToRemove, actual, expected) {
        var nextExpected = expected[advanceKey];
        var nextActual = actual[advanceKey];
        if (IgnoreKeys.valueIsArray(nextExpected, nextActual)) {
            nextExpected.forEach(function (_nextExpected, i) {
                IgnoreKeys.deleteKey(keyToRemove, _nextExpected, nextActual[i]);
            });
        }
        else {
            IgnoreKeys.deleteKey(keyToRemove, nextExpected, nextActual);
        }
    };
    /*
        Called when the initial process() method encounters a String as
        opposed to an object at the top-level
     */
    IgnoreKeys.parseIgnoreString = function (ignoreString, expected, actual) {
        var ignoreArr = ignoreString.split('.');
        if (ignoreArr.length === 1) {
            IgnoreKeys.deleteKey(ignoreArr[0], expected, actual);
            return;
        }
        var advanceKey = ignoreArr.shift();
        var nextIgnoreString = ignoreArr.join('.');
        var nextExpected = expected[advanceKey];
        var nextActual = actual[advanceKey];
        if (IgnoreKeys.valueIsArray(nextExpected, nextActual)) {
            nextExpected.forEach(function (_nextExpected, i) {
                IgnoreKeys.parseIgnoreString(nextIgnoreString, _nextExpected, nextActual[i]);
            });
        }
        else {
            IgnoreKeys.parseIgnoreString(nextIgnoreString, nextExpected, nextActual);
        }
    };
    ;
    /*
     Called when a key has been encounted which represents a nested path
     ie) "my.nested.path" : "keyToRemove" | { "object": "toContinueParsingOnceTraversed" }
     */
    IgnoreKeys.parseIgnoreObjectPathString = function (ignoreStringKey, ignoreValue, expected, actual) {
        // goal here is to split the string, advance to the next item, once fully advanced, take action
        var ignoreArr = ignoreStringKey.split(".");
        if (ignoreArr.length > 1) {
            // advance in the expected and actual objects and recurse
            var advanceKey = ignoreArr.shift();
            var nextIgnoreStringKey_1 = ignoreArr.join(".");
            var nextExpected = expected[advanceKey];
            var nextActual_2 = actual[advanceKey];
            if (IgnoreKeys.valueIsArray(nextExpected, nextActual_2)) {
                nextExpected.forEach(function (_nextExpected, i) {
                    IgnoreKeys.parseIgnoreObjectPathString(nextIgnoreStringKey_1, ignoreValue, _nextExpected, nextActual_2[i]);
                });
            }
            else {
                IgnoreKeys.parseIgnoreObjectPathString(nextIgnoreStringKey_1, ignoreValue, nextExpected, nextActual_2);
            }
        }
        else {
            // take action
            var advanceKey = ignoreArr[0];
            var nextExpected_1 = expected[advanceKey];
            var nextActual_3 = actual[advanceKey];
            // the value could be another object, an array of keys to delete
            if (_.isArray(ignoreValue)) {
                // remove all these dang keys
                ignoreValue.forEach(function (keyToRemove) {
                    if (IgnoreKeys.valueIsArray(nextExpected_1, nextActual_3)) {
                        nextExpected_1.forEach(function (_nextExpected, i) {
                            IgnoreKeys.deleteKey(keyToRemove, _nextExpected, nextActual_3[i]);
                        });
                    }
                    else {
                        IgnoreKeys.deleteKey(keyToRemove, nextExpected_1, nextActual_3);
                    }
                });
            }
            else if (_.isObject(ignoreValue)) {
                // advance in expected/actual and then parse the obj
                if (IgnoreKeys.valueIsArray(nextExpected_1, nextActual_3)) {
                    nextExpected_1.forEach(function (_nextExpected, i) {
                        IgnoreKeys.parseIgnoreObject(ignoreValue, _nextExpected, nextActual_3[i]);
                    });
                }
                else {
                    IgnoreKeys.parseIgnoreObject(ignoreValue, nextExpected_1, nextActual_3);
                }
            }
        }
    };
    IgnoreKeys.deleteKey = function (key, expected, actual) {
        delete expected[key];
        delete actual[key];
    };
    IgnoreKeys.valueIsArray = function (expected, actual) {
        return _.isArray(expected) && _.isArray(actual);
    };
    return IgnoreKeys;
}());
exports.IgnoreKeys = IgnoreKeys;
//# sourceMappingURL=IgnoreKeys.js.map