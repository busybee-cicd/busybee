import * as _ from 'lodash';

export class KeyIdentifier {
    static process(config: any, expected: any, actual: any, action: (key:string, ex:any, ac:any) => void) {
        // parse the config payload
        config.forEach((configItem) => {
            if (_.isObject(configItem) && !_.isArray(configItem)) {
                KeyIdentifier.parseConfigObject(configItem, expected, actual, action);
            } else if (_.isString(configItem)) {
                KeyIdentifier.parseConfigString(configItem, expected, actual, action);
            }
        });

        return {expected, actual};
    }

    /*
        Called when the initial process() method encounters an Object
     */
    private static parseConfigObject(configObj, expected, actual, action: (key:string, expected:any, actual:any) => void) {
        _.forEach(configObj, (v, k) => {
            // first split the key to see if we need to traverse further before deleting anything
            let keyArray = k === '.' ? [k] : k.split('.');
            if (keyArray.length > 1) {
                // we need to dive deeper..this key describes further nesting ie) key.childKey.grandChild.key
                KeyIdentifier.parseConfigObjectPathString(k, v, expected, actual, action);
                return;
            }

            if (_.isArray(v)) {
                v.forEach((keyToRemove) => {
                    // keyToRemove could be a string or an object
                    if (_.isObject(keyToRemove) && !_.isArray(keyToRemove)) { // an object describing further recursion
                        // advance the expected/actual and pass in the keyToRemove (configObj)
                        let nextExpected = expected[k];
                        let nextActual = actual[k];
                        if (KeyIdentifier.valueIsArray(nextExpected, nextActual)) { // if this next key is a collection in our actual/expected
                            nextExpected.forEach((_nextExpected, i) => {
                                KeyIdentifier.parseConfigObject(keyToRemove, _nextExpected, nextActual[i], action);
                            })
                        } else {
                            KeyIdentifier.parseConfigObject(keyToRemove, nextExpected, nextActual, action);
                        }

                    } else { // simply a string representing a key to remove at this iteration
                        KeyIdentifier.advanceAndRemoveKey(k, keyToRemove, expected, actual, action);
                    }
                });
            } else if (_.isObject(v)) {
                let nextExpected = expected[k];
                let nextActual = actual[k];
                if (KeyIdentifier.valueIsArray(nextExpected, nextActual)) {
                    nextExpected.forEach((_nextExpected, i) => {
                        KeyIdentifier.parseConfigObject(v, _nextExpected, actual[i], action);
                    });
                } else {
                    KeyIdentifier.parseConfigObject(v, nextExpected, nextActual, action);
                }
            } else if (_.isString(v)) {
                KeyIdentifier.advanceAndRemoveKey(k, v, expected, actual, action);
            }
        });
    }

    private static advanceAndRemoveKey(advanceKey, keyToRemove, actual, expected, action: (key:string, expected:any, actual:any) => void) {
        let nextExpected = advanceKey === '.' ? expected : expected[advanceKey];
        let nextActual = advanceKey === '.' ? actual : actual[advanceKey];
        if (KeyIdentifier.valueIsArray(nextExpected, nextActual)) {
            nextExpected.forEach((_nextExpected, i) => {
                action(keyToRemove, _nextExpected, nextActual[i]);
                //KeyIdentifier.deleteKey(keyToRemove, _nextExpected, nextActual[i]);
            });
        } else {
            action(keyToRemove, nextExpected, nextActual);
            // KeyIdentifier.deleteKey(keyToRemove, nextExpected, nextActual);
        }
    }

    /*
        Called when the initial process() method encounters a String as
        opposed to an object at the top-level
     */
    private static parseConfigString(configString, expected, actual, action: (key:string, expected:any, actual:any) => void) {
        let configArr = configString === '.' ? [configString] : configString.split('.');
        if (configArr.length === 1) {
            action(configArr[0], expected, actual);
            //KeyIdentifier.deleteKey(configArr[0], expected, actual);
            return;
        }

        let advanceKey = configArr.shift();
        let nextConfigString = configArr.join('.');
        let nextExpected = advanceKey === '.' ? expected : expected[advanceKey];
        let nextActual = advanceKey === '.'? actual : actual[advanceKey];
        if (KeyIdentifier.valueIsArray(nextExpected, nextActual)) {
            nextExpected.forEach((_nextExpected, i) => {
                KeyIdentifier.parseConfigString(nextConfigString, _nextExpected, nextActual[i], action);
            });
        } else {
            KeyIdentifier.parseConfigString(nextConfigString, nextExpected, nextActual, action);
        }
    };

    /*
     Called when a key has been encounted which represents a nested path
     ie) "my.nested.path" : "keyToRemove" | { "object": "toContinueParsingOnceTraversed" }
     */
    private static parseConfigObjectPathString(configStringKey, configValue, expected, actual, action: (key:string, expected:any, actual:any) => void) {
        // goal here is to split the string, advance to the next item, once fully advanced, take action
        let configArr = configStringKey === '.' ? [configStringKey] : configStringKey.split('.');
        if (configArr.length > 1) {
            // advance in the expected and actual objects and recurse
            let advanceKey = configArr.shift();
            let nextConfigStringKey = configArr.join(".");
            let nextExpected = advanceKey === '.' ? expected : expected[advanceKey];
            let nextActual = advanceKey === '.' ? actual : actual[advanceKey];
            if (KeyIdentifier.valueIsArray(nextExpected, nextActual)) {
                nextExpected.forEach((_nextExpected, i) => {
                    KeyIdentifier.parseConfigObjectPathString(nextConfigStringKey, configValue, _nextExpected, nextActual[i], action);
                });
            } else {
                KeyIdentifier.parseConfigObjectPathString(nextConfigStringKey, configValue, nextExpected, nextActual, action);
            }
        } else {
            // take action
            let advanceKey = configArr[0];
            let nextExpected = advanceKey === '.' ? expected : expected[advanceKey];
            let nextActual = advanceKey === '.' ? actual : actual[advanceKey];
            // the value could be another object, an array of keys to delete
            if (_.isArray(configValue)) { // always a have to check _.isArray first because _.isObject([]) == true
                // remove all these dang keys
                configValue.forEach((keyToRemove) => {
                    if (KeyIdentifier.valueIsArray(nextExpected, nextActual)) {
                        nextExpected.forEach((_nextExpected, i) => {
                            action(keyToRemove, _nextExpected, nextActual[i]);
                            //KeyIdentifier.deleteKey(keyToRemove, _nextExpected, nextActual[i]);
                        })
                    } else {
                        action(keyToRemove, nextExpected, nextActual);
                        //KeyIdentifier.deleteKey(keyToRemove, nextExpected, nextActual);
                    }
                });
            } else if (_.isObject(configValue)) {
                // advance in expected/actual and then parse the obj
                if (KeyIdentifier.valueIsArray(nextExpected, nextActual)) {
                    nextExpected.forEach((_nextExpected, i) => {
                        KeyIdentifier.parseConfigObject(configValue, _nextExpected, nextActual[i], action);
                    })
                } else {
                    KeyIdentifier.parseConfigObject(configValue, nextExpected, nextActual, action);
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