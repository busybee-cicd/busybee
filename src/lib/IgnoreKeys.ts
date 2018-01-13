import * as _ from 'lodash';

export class IgnoreKeys {
    static process(ignore, expected, actual) {
        // parse the ignore payload
        ignore.forEach((ignoreItem) => {
            if (_.isObject(ignoreItem) && !_.isArray(ignoreItem)) {
                IgnoreKeys.parseIgnoreObject(ignoreItem, expected, actual);
            } else if (_.isString(ignoreItem)) {
                IgnoreKeys.parseIgnoreString(ignoreItem, expected, actual);
            }
        });

        return {expected, actual};
    }

    /*
        Called when the initial process() method encounters an Object
     */
    private static parseIgnoreObject(ignoreObj, expected, actual) {
        _.forEach(ignoreObj, (v, k) => {
            // first split the key to see if we need to traverse further before deleting anything
            let keyArray = k.split(".");
            if (keyArray.length > 1) {
                // we need to dive deeper..this key describes further nesting ie) key.childKey.grandChild.key
                IgnoreKeys.parseIgnoreObjectPathString(k, v, expected, actual);
                return;
            }

            if (_.isArray(v)) {
                v.forEach((keyToRemove) => {
                    // keyToRemove could be a string or an object
                    if (_.isObject(keyToRemove) && !_.isArray(keyToRemove)) { // an object describing further recursion
                        // advance the expected/actual and pass in the keyToRemove (ignoreObj)
                        let nextExpected = expected[k];
                        let nextActual = actual[k];
                        if (IgnoreKeys.valueIsArray(nextExpected, nextActual)) { // if this next key is a collection in our actual/expected
                            nextExpected.forEach((_nextExpected, i) => {
                                IgnoreKeys.parseIgnoreObject(keyToRemove, _nextExpected, nextActual[i]);
                            })
                        } else {
                            IgnoreKeys.parseIgnoreObject(keyToRemove, nextExpected, nextActual);
                        }

                    } else { // simply a string representing a key to remove at this iteration
                        IgnoreKeys.advanceAndRemoveKey(k, keyToRemove, expected, actual);
                    }
                });
            } else if (_.isObject(v)) {
                let nextExpected = expected[k];
                let nextActual = actual[k];
                if (IgnoreKeys.valueIsArray(nextExpected, nextActual)) {
                    nextExpected.forEach((_nextExpected, i) => {
                        IgnoreKeys.parseIgnoreObject(v, _nextExpected, actual[i]);
                    });
                } else {
                    IgnoreKeys.parseIgnoreObject(v, nextExpected, nextActual);
                }
            } else if (_.isString(v)) {
                IgnoreKeys.advanceAndRemoveKey(k, v, expected, actual);
            }
        });
    }

    private static advanceAndRemoveKey(advanceKey, keyToRemove, actual, expected) {
        let nextExpected = expected[advanceKey];
        let nextActual = actual[advanceKey];
        if (IgnoreKeys.valueIsArray(nextExpected, nextActual)) {
            nextExpected.forEach((_nextExpected, i) => {
                IgnoreKeys.deleteKey(keyToRemove, _nextExpected, nextActual[i]);
            });
        } else {
            IgnoreKeys.deleteKey(keyToRemove, nextExpected, nextActual);
        }
    }

    /*
        Called when the initial process() method encounters a String as
        opposed to an object at the top-level
     */
    private static parseIgnoreString(ignoreString, expected, actual) {
        let ignoreArr = ignoreString.split('.');
        if (ignoreArr.length === 1) {
            IgnoreKeys.deleteKey(ignoreArr[0], expected, actual);
            return;
        }

        let advanceKey = ignoreArr.shift();
        let nextIgnoreString = ignoreArr.join('.');
        let nextExpected = expected[advanceKey];
        let nextActual = actual[advanceKey];
        if (IgnoreKeys.valueIsArray(nextExpected, nextActual)) {
            nextExpected.forEach((_nextExpected, i) => {
                IgnoreKeys.parseIgnoreString(nextIgnoreString, _nextExpected, nextActual[i]);
            });
        } else {
            IgnoreKeys.parseIgnoreString(nextIgnoreString, nextExpected, nextActual);
        }
    };

    /*
     Called when a key has been encounted which represents a nested path
     ie) "my.nested.path" : "keyToRemove" | { "object": "toContinueParsingOnceTraversed" }
     */
    private static parseIgnoreObjectPathString(ignoreStringKey, ignoreValue, expected, actual) {
        // goal here is to split the string, advance to the next item, once fully advanced, take action
        let ignoreArr = ignoreStringKey.split(".");
        if (ignoreArr.length > 1) {
            // advance in the expected and actual objects and recurse
            let advanceKey = ignoreArr.shift();
            let nextIgnoreStringKey = ignoreArr.join(".");
            let nextExpected = expected[advanceKey];
            let nextActual = actual[advanceKey];
            if (IgnoreKeys.valueIsArray(nextExpected, nextActual)) {
                nextExpected.forEach((_nextExpected, i) => {
                    IgnoreKeys.parseIgnoreObjectPathString(nextIgnoreStringKey, ignoreValue, _nextExpected, nextActual[i]);
                });
            } else {
                IgnoreKeys.parseIgnoreObjectPathString(nextIgnoreStringKey, ignoreValue, nextExpected, nextActual);
            }
        } else {
            // take action
            let advanceKey = ignoreArr[0];
            let nextExpected = expected[advanceKey];
            let nextActual = actual[advanceKey];
            // the value could be another object, an array of keys to delete
            if (_.isArray(ignoreValue)) { // always a have to check _.isArray first because _.isObject([]) == true
                // remove all these dang keys
                ignoreValue.forEach((keyToRemove) => {
                    if (IgnoreKeys.valueIsArray(nextExpected, nextActual)) {
                        nextExpected.forEach((_nextExpected, i) => {
                            IgnoreKeys.deleteKey(keyToRemove, _nextExpected, nextActual[i]);
                        })
                    } else {
                        IgnoreKeys.deleteKey(keyToRemove, nextExpected, nextActual);
                    }
                });
            } else if (_.isObject(ignoreValue)) {
                // advance in expected/actual and then parse the obj
                if (IgnoreKeys.valueIsArray(nextExpected, nextActual)) {
                    nextExpected.forEach((_nextExpected, i) => {
                        IgnoreKeys.parseIgnoreObject(ignoreValue, _nextExpected, nextActual[i]);
                    })
                } else {
                    IgnoreKeys.parseIgnoreObject(ignoreValue, nextExpected, nextActual);
                }
            }
        }
    }

    private static deleteKey(key, expected, actual) {
        delete expected[key];
        delete actual[key];
    }

    private static valueIsArray(expected, actual) {
        return _.isArray(expected) && _.isArray(actual);
    }
}