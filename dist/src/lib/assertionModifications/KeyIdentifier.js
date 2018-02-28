"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var KeyIdentifier = /** @class */ (function () {
    function KeyIdentifier() {
    }
    KeyIdentifier.process = function (config, expected, actual, action) {
        // parse the config payload
        config.forEach(function (configItem) {
            if (_.isObject(configItem) && !_.isArray(configItem)) {
                KeyIdentifier.parseConfigObject(configItem, expected, actual, action);
            }
            else if (_.isString(configItem)) {
                KeyIdentifier.parseConfigString(configItem, expected, actual, action);
            }
        });
        return { expected: expected, actual: actual };
    };
    /*
        Called when the initial process() method encounters an Object
     */
    KeyIdentifier.parseConfigObject = function (configObj, expected, actual, action) {
        _.forEach(configObj, function (v, k) {
            // first split the key to see if we need to traverse further before performing the supplied action
            var keyArray = k === '*' ? [k] : k.split('.');
            if (keyArray.length > 1) {
                // we need to dive deeper..this key describes further nesting ie) key.childKey.grandChild.key
                KeyIdentifier.parseConfigObjectPathString(k, v, expected, actual, action);
                return;
            }
            if (_.isArray(v)) {
                v.forEach(function (keyToRemove) {
                    // keyToRemove could be a string or an object
                    if (_.isObject(keyToRemove) && !_.isArray(keyToRemove)) {
                        // advance the expected/actual and pass in the keyToRemove (configObj)
                        var nextExpected = expected[k];
                        var nextActual_1 = actual[k];
                        if (KeyIdentifier.valueIsArray(nextExpected, nextActual_1)) {
                            nextExpected.forEach(function (_nextExpected, i) {
                                KeyIdentifier.parseConfigObject(keyToRemove, _nextExpected, nextActual_1[i], action);
                            });
                        }
                        else {
                            KeyIdentifier.parseConfigObject(keyToRemove, nextExpected, nextActual_1, action);
                        }
                    }
                    else {
                        KeyIdentifier.advanceAndRemoveKey(k, keyToRemove, expected, actual, action);
                    }
                });
            }
            else if (_.isObject(v)) {
                var nextExpected = expected[k];
                var nextActual = actual[k];
                if (KeyIdentifier.valueIsArray(nextExpected, nextActual)) {
                    nextExpected.forEach(function (_nextExpected, i) {
                        KeyIdentifier.parseConfigObject(v, _nextExpected, actual[i], action);
                    });
                }
                else {
                    KeyIdentifier.parseConfigObject(v, nextExpected, nextActual, action);
                }
            }
            else if (_.isString(v)) {
                KeyIdentifier.advanceAndRemoveKey(k, v, expected, actual, action);
            }
        });
    };
    KeyIdentifier.advanceAndRemoveKey = function (advanceKey, keyToRemove, actual, expected, action) {
        var nextExpected = advanceKey === '*' ? expected : expected[advanceKey];
        var nextActual = advanceKey === '*' ? actual : actual[advanceKey];
        if (KeyIdentifier.valueIsArray(nextExpected, nextActual)) {
            nextExpected.forEach(function (_nextExpected, i) {
                action(keyToRemove, _nextExpected, nextActual[i]);
            });
        }
        else {
            action(keyToRemove, nextExpected, nextActual);
        }
    };
    /*
        Called when the initial process() method encounters a String as
        opposed to an object at the top-level
     */
    KeyIdentifier.parseConfigString = function (configString, expected, actual, action) {
        var configArr = configString === '*' ? [configString] : configString.split('.');
        if (configArr.length === 1) {
            action(configArr[0], expected, actual);
            return;
        }
        var advanceKey = configArr.shift();
        var nextConfigString = configArr.join('.');
        var nextExpected = advanceKey === '*' ? expected : expected[advanceKey];
        var nextActual = advanceKey === '*' ? actual : actual[advanceKey];
        if (KeyIdentifier.valueIsArray(nextExpected, nextActual)) {
            nextExpected.forEach(function (_nextExpected, i) {
                KeyIdentifier.parseConfigString(nextConfigString, _nextExpected, nextActual[i], action);
            });
        }
        else {
            KeyIdentifier.parseConfigString(nextConfigString, nextExpected, nextActual, action);
        }
    };
    ;
    /*
     Called when a key has been encounted which represents a nested path
     ie) "my.nested.path" : "keyToRemove" | { "object": "toContinueParsingOnceTraversed" }
     */
    KeyIdentifier.parseConfigObjectPathString = function (configStringKey, configValue, expected, actual, action) {
        // goal here is to split the string, advance to the next item, once fully advanced, take action
        var configArr = configStringKey === '*' ? [configStringKey] : configStringKey.split('.');
        if (configArr.length > 1) {
            // advance in the expected and actual objects and recurse
            var advanceKey = configArr.shift();
            var nextConfigStringKey_1 = configArr.join(".");
            var nextExpected = advanceKey === '*' ? expected : expected[advanceKey];
            var nextActual_2 = advanceKey === '*' ? actual : actual[advanceKey];
            if (KeyIdentifier.valueIsArray(nextExpected, nextActual_2)) {
                nextExpected.forEach(function (_nextExpected, i) {
                    KeyIdentifier.parseConfigObjectPathString(nextConfigStringKey_1, configValue, _nextExpected, nextActual_2[i], action);
                });
            }
            else {
                KeyIdentifier.parseConfigObjectPathString(nextConfigStringKey_1, configValue, nextExpected, nextActual_2, action);
            }
        }
        else {
            // take action
            var advanceKey = configArr[0];
            var nextExpected_1 = advanceKey === '*' ? expected : expected[advanceKey];
            var nextActual_3 = advanceKey === '*' ? actual : actual[advanceKey];
            // the value could be another object, an array of keys to delete
            if (_.isArray(configValue)) {
                // remove all these dang keys
                configValue.forEach(function (keyToRemove) {
                    if (KeyIdentifier.valueIsArray(nextExpected_1, nextActual_3)) {
                        nextExpected_1.forEach(function (_nextExpected, i) {
                            action(keyToRemove, _nextExpected, nextActual_3[i]);
                            //KeyIdentifier.deleteKey(keyToRemove, _nextExpected, nextActual[i]);
                        });
                    }
                    else {
                        action(keyToRemove, nextExpected_1, nextActual_3);
                        //KeyIdentifier.deleteKey(keyToRemove, nextExpected, nextActual);
                    }
                });
            }
            else if (_.isObject(configValue)) {
                // advance in expected/actual and then parse the obj
                if (KeyIdentifier.valueIsArray(nextExpected_1, nextActual_3)) {
                    nextExpected_1.forEach(function (_nextExpected, i) {
                        KeyIdentifier.parseConfigObject(configValue, _nextExpected, nextActual_3[i], action);
                    });
                }
                else {
                    KeyIdentifier.parseConfigObject(configValue, nextExpected_1, nextActual_3, action);
                }
            }
        }
    };
    KeyIdentifier.deleteKey = function (key, expected, actual) {
        delete expected[key];
        delete actual[key];
    };
    KeyIdentifier.valueIsArray = function (expected, actual) {
        return _.isArray(expected) && _.isArray(actual);
    };
    return KeyIdentifier;
}());
exports.KeyIdentifier = KeyIdentifier;
//# sourceMappingURL=KeyIdentifier.js.map