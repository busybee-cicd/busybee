"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ava_1 = require("ava");
var UnorderedCollections_1 = require("../../src/lib/assertionModifications/UnorderedCollections");
ava_1.default(function (t) {
    // '.' will only check the top-level collection and does not apply to any unordered subCollections
    var expected = [
        {
            subCollection: [
                1, 2, 3, 4
            ]
        },
        {
            "key": "value",
            subCollection: [
                5, 6, 7, 8
            ]
        }
    ];
    var actual = [
        {
            "key": "value",
            subCollection: [
                8, 6, 7, 5
            ]
        },
        {
            subCollection: [
                4, 3, 2, 1
            ]
        },
    ];
    UnorderedCollections_1.UnorderedCollections.process(['*'], expected, actual);
    t.notDeepEqual(expected, actual);
});
ava_1.default(function (t) {
    // this passes because the user has specified both the unordered top-level and the unordered subCollection
    var expected = [
        {
            subCollection: [
                1, 2, 3, 4
            ]
        },
        {
            "key": "value",
            subCollection: [
                5, 6, 7, 8
            ]
        }
    ];
    var actual = [
        {
            "key": "value",
            subCollection: [
                8, 6, 7, 5
            ]
        },
        {
            subCollection: [
                4, 3, 2, 1
            ]
        },
    ];
    UnorderedCollections_1.UnorderedCollections.process(['*', '*.subCollection'], expected, actual);
    t.deepEqual(expected, actual);
});
ava_1.default(function (t) {
    //  an ordered top-level collection can contain un-ordered child collection
    var expected = [
        {
            subCollection: [
                1, 2, 3, 4
            ]
        },
        {
            "key": "value",
            subCollection: [
                5, 6, 7, 8
            ]
        }
    ];
    var actual = [
        {
            subCollection: [
                4, 3, 2, 1
            ]
        },
        {
            "key": "value",
            subCollection: [
                8, 6, 7, 5
            ]
        }
    ];
    UnorderedCollections_1.UnorderedCollections.process(['*.subCollection'], expected, actual);
    t.deepEqual(expected, actual);
});
ava_1.default(function (t) {
    //  it catches when collections are ambiguous and there is know way to know if the order is correct
    var expected = [
        {
            subCollection: [
                1, 2, 3, 4
            ]
        },
        {
            subCollection: [
                5, 6, 7, 8
            ]
        }
    ];
    var actual = [
        {
            subCollection: [
                8, 6, 7, 5
            ]
        },
        {
            subCollection: [
                4, 3, 2, 1
            ]
        }
    ];
    UnorderedCollections_1.UnorderedCollections.process(['*.subCollection'], expected, actual);
    t.deepEqual(expected, actual);
});
ava_1.default(function (t) {
    //  it catches when collections are ambiguous and there is know way to know if the order is correct
    var expected = [
        {
            subCollection: [
                [1, 2, 3]
            ]
        }
    ];
    var actual = [
        {
            subCollection: [
                [3, 2, 1]
            ]
        }
    ];
    UnorderedCollections_1.UnorderedCollections.process(['*.subCollection'], expected, actual);
    t.deepEqual(expected, actual);
});
//# sourceMappingURL=unorderedCollectionsTest.js.map