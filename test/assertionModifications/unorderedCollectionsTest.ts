import test from 'ava';
import {UnorderedCollections} from "../../src/lib/assertionModifications/UnorderedCollections";


test((t) => {
    // '.' will only check the top-level collection and does not apply to any unordered subCollections
    let expected = [
        {
            subCollection: [
                1,2,3,4
            ]
        },
        {
            "key": "value",
            subCollection: [
                5,6,7,8
            ]
        }
    ];

    let actual = [
        {
            "key": "value",
            subCollection: [
                8,6,7,5
            ]
        },
        {
            subCollection: [
                4,3,2,1
            ]
        },
    ];
    UnorderedCollections.process(['*'], expected, actual);
    t.notDeepEqual(expected, actual);
});

test((t) => {
    // this passes because the user has specified both the unordered top-level and the unordered subCollection
    let expected = [
        {
            subCollection: [
                1,2,3,4
            ]
        },
        {
            "key": "value",
            subCollection: [
                5,6,7,8
            ]
        }
    ];

    let actual = [
        {
            "key": "value",
            subCollection: [
                8,6,7,5
            ]
        },
        {
            subCollection: [
                4,3,2,1
            ]
        },
    ];
    UnorderedCollections.process(['*', '*.subCollection'], expected, actual);
    t.deepEqual(expected, actual);
});


test((t) => {
    //  an ordered top-level collection can contain un-ordered child collection
    let expected = [
        {
            subCollection: [
                1,2,3,4
            ]
        },
        {
            "key": "value",
            subCollection: [
                5,6,7,8
            ]
        }
    ];

    let actual = [
        {
            subCollection: [
                4,3,2,1
            ]
        },
        {
            "key": "value",
            subCollection: [
                8,6,7,5
            ]
        }
    ];

    UnorderedCollections.process(['*.subCollection'], expected, actual);
    t.deepEqual(expected, actual);
});

test((t) => {
    //  it catches when collections are ambiguous and there is know way to know if the order is correct
    let expected = [
        {
            subCollection: [
                1,2,3,4
            ]
        },
        {
            subCollection: [
                5,6,7,8
            ]
        }
    ];

    let actual = [
        {
            subCollection: [
                8,6,7,5
            ]
        },
        {
            subCollection: [
                4,3,2,1
            ]
        }
    ];

    UnorderedCollections.process(['*.subCollection'], expected, actual);
    t.deepEqual(expected, actual);
});

test((t) => {
    //  it catches when collections are ambiguous and there is know way to know if the order is correct
    let expected = [
        {
            subCollection: [
               [1,2,3]
            ]
        }
    ];

    let actual = [
        {
            subCollection: [
                [3,2,1]
            ]
        }
    ];

    UnorderedCollections.process(['*.subCollection'], expected, actual);
    t.deepEqual(expected, actual);
});