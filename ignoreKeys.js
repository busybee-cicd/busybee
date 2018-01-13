const _ = require('lodash');

let exampleExpected = {
    "id": 638845,
    "effectiveDate": 1515702780000,
    "effectiveSequence": 102,
    "ineffectiveDate": null,
    "effectiveStatus": null,
    "sourceInfo": {
        "createdDatetime": 1515702825520,
        "dataSourceType": "U",
        "userId": 10182,
        "dataSourceId": 41,
        "dataSourceDescr": null,
        "jobId": null,
        "lastUpdateDatetime": 1515702825520,
        "someKey": {
            "hello": "world",
            "keyToIgnoreInsideObject" : "blah"
        }
    },
    "statusList": [
        {
            "id": 638845,
            "effectiveStatus": "M",
            "sourceInfo": {
                "createdDatetime": 1515702825520,
                "dataSourceType": "U",
                "userId": 10182,
                "dataSourceId": 41,
                "dataSourceDescr": null,
                "jobId": null,
                "lastUpdateDatetime": 1515702825520,
            },
            "justification": "test justification",
            "isFirstStatus": false,
            "isLastStatus": false,
            "firstStatus": false,
            "lastStatus": false
        }
    ],
    "parentPlantId": 31760,
    "parentBlockId": 2033,
    "parentBlockChangeId": null,
    "parentTrainId": 49949,
    "parentTrainChangeId": null,
    "childChange": false
}

let exampleActual = {
    "id": 638845,
    "effectiveDate": 1515702780000,
    "effectiveSequence": 102,
    "ineffectiveDate": null,
    "effectiveStatus": null,
    "sourceInfo": {
        "createdDatetime": 1515702825520,
        "dataSourceType": "U",
        "userId": 10182,
        "dataSourceId": 41,
        "dataSourceDescr": null,
        "jobId": null,
        "lastUpdateDatetime": 1515702825520,
        "someKey": {
            "hello": "world",
            "keyToIgnoreInsideObject" : "i dont match"
        }
    },
    "statusList": [
        {
            "id": "idThatDoesn't Match",
            "effectiveStatus": "M",
            "sourceInfo": {
                "createdDatetime": 1515702825520,
                "dataSourceType": "U",
                "userId": 10182,
                "dataSourceId": 41,
                "dataSourceDescr": null,
                "jobId": null,
                "lastUpdateDatetime": 1515702825520,
            },
            "justification": "test justification",
            "isFirstStatus": false,
            "isLastStatus": false,
            "firstStatus": false,
            "lastStatus": false
        }
    ],
    "parentPlantId": 31760,
    "parentBlockId": 2033,
    "parentBlockChangeId": null,
    "parentTrainId": 49949,
    "parentTrainChangeId": null,
    "childChange": false
};


let ignore = [
    {
        sourceInfo: [
            "createdDatetime",
            "lastUpdateDatetime",
            {
                "someKey": "keyToIgnoreInsideObject" // Only this not working in this example.
            }
        ]
    },
    {
        "statusList.sourceInfo" : ["createdDatetime", "lastUpdateDatetime"]
    },
    "statusList.id"
];


function entry(ignore, expected, actual) {
    // parse the ignore payload

    ignore.forEach((ignoreItem) => {
       if (_.isObject(ignoreItem) && !_.isArray(ignoreItem)) {
           parseIgnoreObject(ignoreItem, expected, actual);
       } else if (_.isString(ignoreItem)) {
           parseIgnoreString(ignoreItem, expected, actual);
       }
    });
}

function parseIgnoreObject(ignoreObj, expected, actual) {
    _.forEach(ignoreObj, (v, k) => {
        // first split the key to see if we need to traverse further before deleting anything
        let keyArray = k.split(".");
        if (keyArray.length > 1) {
            // we need to dive deeper..this key describes further nesting ie) key.childKey.grandChild.key
            parseIgnoreObjectPathString(k, v, expected, actual);
            return;
        }

        if (_.isArray(v)) {
            v.forEach((keyToRemove) => {
                // keyToRemove could be a string or an object
                if (_.isObject(keyToRemove) && !_.isArray(keyToRemove)) { // an object describing further recursion
                    // advance the expected/actual and pass in the keyToRemove (ignoreObj)
                    let nextExpected = expected[k];
                    let nextActual = actual[k];
                    if (valueIsArray(nextExpected, nextActual)) { // if this next key is a collection in our actual/expected
                        nextExpected.forEach((_nextExpected, i) => {
                            parseIgnoreObject(keyToRemove, _nextExpected, nextActual[i]);
                        })
                    } else {
                        parseIgnoreObject(keyToRemove, nextExpected, nextActual);
                    }

                } else { // simply a string representing a key to remove at this iteration
                    advanceAndRemoveKey(k, keyToRemove, expected, actual);
                }
            });
        } else if (_.isObject(v)) {
            let nextExpected = expected[k];
            let nextActual = actual[k];
            if (valueIsArray(nextExpected, nextActual)) {
                nextExpected.forEach((_nextExpected, i) => {
                    parseIgnoreObject(v, _nextExpected, actual[i]);
                });
            } else {
                parseIgnoreObject(v, nextExpected, nextActual);
            }
        } else if (_.isString(v)) {
            advanceAndRemoveKey(k, v, expected, actual);
        }
    });
}

function advanceAndRemoveKey(advanceKey, keyToRemove, actual, expected) {
    let nextExpected = expected[advanceKey];
    let nextActual = actual[advanceKey];
    if (valueIsArray(nextExpected, nextActual)) {
        nextExpected.forEach((_nextExpected, i) => {
            deleteKey(keyToRemove, _nextExpected, nextActual[i]);
        });
    } else {
        deleteKey(keyToRemove, nextExpected, nextActual);
    }
}


function parseIgnoreObjectPathString(ignoreStringKey, ignoreValue, expected, actual) {
    // goal here is to split the string, advance to the next item, once fully advanced, take action
    let ignoreArr = ignoreStringKey.split(".");
    if (ignoreArr.length > 1) {
        // advance in the expected and actual objects and recurse
        let advanceKey = ignoreArr.shift();
        let nextIgnoreStringKey = ignoreArr.join(".");
        let nextExpected = expected[advanceKey];
        let nextActual = actual[advanceKey];
        if (valueIsArray(nextExpected, nextActual)) {
            nextExpected.forEach((_nextExpected, i) => {
                parseIgnoreObjectPathString(nextIgnoreStringKey, ignoreValue, _nextExpected, nextActual[i]);
            });
        } else {
            parseIgnoreObjectPathString(nextIgnoreStringKey, ignoreValue, nextExpected, nextActual);
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
                if (valueIsArray(nextExpected, nextActual)) {
                    nextExpected.forEach((_nextExpected, i) => {
                        deleteKey(keyToRemove, _expected, nextActual[i]);
                    })
                } else {
                    deleteKey(keyToRemove, nextExpected, nextActual);
                }
            });
        } else if (_.isObject(ignoreValue)) {
            // advance in expected/actual and then parse the obj
            if (valueIsArray(nextExpected, nextActual)) {
                nextExpected.forEach((_nextExpected, i) => {
                    parseIgnoreObject(ignoreValue,  _nextExpected, nextActual[i]);
                })
            } else {
                parseIgnoreObject(ignoreValue,  nextExpected, nextActual);
            }
        }
    }
}

function parseIgnoreString(ignoreString, expected, actual) {
    let ignoreArr = ignoreString.split('.');
    if (ignoreArr.length === 1) {
        deleteKey(ignoreArr[0], expected, actual);
        return;
    }

    let advanceKey = ignoreArr.shift();
    let nextIgnoreString = ignoreArr.join('.');
    let nextExpected = expected[advanceKey];
    let nextActual = actual[advanceKey];
    if (valueIsArray(nextExpected, nextActual)) {
        nextExpected.forEach((_nextExpected, i) => {
            parseIgnoreString(nextIgnoreString, _nextExpected, nextActual[i]);
        });
    } else {
        parseIgnoreString(nextIgnoreString, nextExpected, nextActual);
    }

};



function deleteKey(key, expected, actual) {
    console.log(`removeKey: ${key}`);
    delete expected[key];
    delete actual[key];
    console.log(JSON.stringify(expected, null, '\t'));
    console.log(JSON.stringify(actual, null, '\t'));
}

function valueIsArray(expected, actual) {
    return _.isArray(expected) && _.isArray(actual);
}

entry(ignore, exampleExpected, exampleActual);
console.log('FINAL');
console.log(JSON.stringify(exampleExpected, null, '\t'));
console.log(JSON.stringify(exampleActual, null, '\t'));
