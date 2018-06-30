"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ava_1 = require("ava");
var UnorderedCollections_1 = require("../../src/lib/assertionModifications/UnorderedCollections");
ava_1.default("'*' will only check the top-level collection and does not apply to any unordered subCollections", function (t) {
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
ava_1.default("this passes because the user has specified both the unordered top-level and the unordered subCollection", function (t) {
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
ava_1.default("an ordered top-level collection can contain un-ordered child collection", function (t) {
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
ava_1.default("it aborts when a sub-collection doesn't exist in a payload", function (t) {
    var expected = [
        {
            subCollection: [
                1, 2, 3, 4
            ]
        },
        {
            "key": "b",
            subCollection: [
                5, 6, 7, 8
            ]
        },
        {
            "key": "a"
        }
    ];
    var actual = [
        {
            "key": "a"
        },
        {
            subCollection: [
                4, 3, 2, 1
            ]
        },
        {
            "key": "b",
            subCollection: [
                8, 6, 7, 5
            ]
        }
    ];
    UnorderedCollections_1.UnorderedCollections.process(['*', '*.subCollection'], expected, actual);
    t.deepEqual(expected, actual);
});
ava_1.default("it catches when 2 unorderedCollections are NOT equal at the top-level", function (t) {
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
        },
        {
            "key": "hello"
        }
    ];
    var actual = [
        {
            "key": "world"
        },
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
    try {
        UnorderedCollections_1.UnorderedCollections.process(['*', '*.subCollection'], expected, actual);
    }
    catch (e) {
        t.is(e.message, "The collections at '*' are not equal OR the parent object is a member of an ambiguous collection");
    }
});
ava_1.default("it throws an error when collections are ambiguous and there is know way to know if the order is correct", function (t) {
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
    try {
        UnorderedCollections_1.UnorderedCollections.process(['*', '*.subCollection'], expected, actual);
    }
    catch (e) {
        t.is(e.message, "The collections at 'subCollection' are not equal OR the parent object is a member of an ambiguous collection");
    }
});
//# sourceMappingURL=unorderedCollectionsTest.js.map