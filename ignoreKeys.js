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
                "someKey": "keyToIgnoreInsideObject"
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
        // first split the k string to see if we need to traverse further before deleting anything
        let keyArray = k.split(".");
        if (keyArray.length > 1) {
            // we need to dive deeper..this key describes further nesting ie) key.childKey.grandChild.key
            let advanceKey = keyArray[0];
            parseIgnoreObjectPathString(k, v, expected, actual);
            return;
        }

        if (_.isArray(v)) {
            v.forEach((keyToRemove) => {
                // keyToRemove could be a string or an object
                if (_.isObject(keyToRemove) && !_.isArray(keyToRemove)) {
                    // advance the expected/actual and pass in the keyToRemove (ignoreObj)
                    let nextExpected = expected[k];
                    let nextActual = actual[k];
                    if (_.isArray(nextExpected) && _.isArray(nextActual)) {
                        nextExpected.forEach((_nextExpected, i) => {
                            parseIgnoreObject(keyToRemove, _nextExpected, nextActual[i]);
                        })
                    } else {
                        parseIgnoreObject(keyToRemove, nextExpected, nextActual);
                    }

                } else {
                    let nextExpected = expected[k];
                    let nextActual = actual[k];
                    if (_.isArray(nextExpected) && _.isArray(nextActual)) {
                        nextExpected.forEach((_nextExpected, i) => {
                            removeKey(keyToRemove, _nextExpected, nextActual[i]);
                        });
                    } else {
                        removeKey(keyToRemove, nextExpected, nextActual);
                    }
                }
            });
        } else if (_.isObject(v)) {
            let nextExpected = expected[k];
            let nextActual = actual[k];
            if (_.isArray(nextExpected) && _.isArray(nextActual)) {
                nextExpected.forEach((_nextExpected, i) => {
                    parseIgnoreObject(v, _nextExpected, actual[i]);
                });
            } else {
                parseIgnoreObject(v, nextExpected, nextActual);
            }
        }
    });
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
        if (_.isArray(nextExpected) && _.isArray(nextActual)) {
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
                if (_.isArray(nextExpected) && _.isArray(nextActual)) {
                    nextExpected.forEach((_nextExpected, i) => {
                        removeKey(keyToRemove, _expected, nextActual[i]);
                    })
                } else {
                    removeKey(keyToRemove, nextExpected, nextActual);
                }
            });
        } else if (_.isObject(ignoreValue)) {
            // advance in expected/actual and then parse the obj

            if (_.isArray(nextExpected) && _.isArray(nextActual)) {
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
        removeKey(ignoreArr[0], expected, actual);
        return;
    }

    let advanceKey = ignoreArr.shift();
    let nextIgnoreString = ignoreArr.join('.');
    let nextExpected = expected[advanceKey];
    let nextActual = actual[advanceKey];
    if (_.isArray(nextExpected) && _.isArray(nextActual)) {
        nextExpected.forEach((_nextExpected, i) => {
            parseIgnoreString(nextIgnoreString, _nextExpected, nextActual[i]);
        });
    } else {
        parseIgnoreString(nextIgnoreString, nextExpected, nextActual);
    }

};

function removeKey(key, expected, actual) {
    console.log(`removeKey: ${key}`);
    delete expected[key];
    delete actual[key];
    console.log(JSON.stringify(expected, null, '\t'));
    console.log(JSON.stringify(actual, null, '\t'));
}

entry(ignore, exampleExpected, exampleActual);
console.log('FINAL');
console.log(JSON.stringify(exampleExpected, null, '\t'));
console.log(JSON.stringify(exampleActual, null, '\t'));
