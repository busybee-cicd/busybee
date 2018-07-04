"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ava_1 = require("ava");
var IgnoreKeys_1 = require("../../../src/lib/assertionModifications/IgnoreKeys");
ava_1.default("keys are successfully removed from a basic object", function (t) {
    var actual = {
        hello: 1,
        world: 2
    };
    var expected = {
        hello: 1,
        world: 3
    };
    IgnoreKeys_1.IgnoreKeys.process(['world'], actual, expected);
    t.deepEqual(actual, expected);
});
ava_1.default("keys are successfully removed from a collection of objects", function (t) {
    var actual = [
        {
            hello: 1,
            world: 3
        },
        {
            hello: 1,
            world: 3
        }
    ];
    var expected = [
        {
            hello: 1,
            world: 3
        },
        {
            hello: 1,
            world: 3
        }
    ];
    IgnoreKeys_1.IgnoreKeys.process(['*.world'], actual, expected);
    t.deepEqual(actual, expected);
});
ava_1.default("keys are successfully removed from an object nested in a collection of objects", function (t) {
    var actual = [
        {
            hello: 1,
            world: {
                a: 'b',
                c: 'd'
            }
        },
        {
            hello: 1,
            world: {
                a: 'b',
                c: 'd'
            }
        }
    ];
    var expected = [
        {
            hello: 1,
            world: {
                a: 'wrong',
                c: 'd'
            }
        },
        {
            hello: 1,
            world: {
                a: 'wrong',
                c: 'd'
            }
        }
    ];
    IgnoreKeys_1.IgnoreKeys.process(['*.world.a'], actual, expected);
    t.deepEqual(actual, expected);
});
ava_1.default("keys are successfully removed from an object using object syntax", function (t) {
    var actual = {
        hello: 1,
        world: {
            a: 'b',
            c: 'd'
        }
    };
    var expected = {
        hello: 1,
        world: {
            a: 'wrong',
            c: 'd'
        }
    };
    IgnoreKeys_1.IgnoreKeys.process([
        {
            'world': 'a'
        }
    ], actual, expected);
    t.deepEqual(actual, expected);
});
ava_1.default("keys are successfully removed from a collection of objects using object syntax", function (t) {
    var actual = [
        {
            hello: 1,
            world: {
                a: 'b',
                c: 'd'
            }
        },
        {
            hello: 1,
            world: {
                a: 'b',
                c: 'd'
            }
        }
    ];
    var expected = [
        {
            hello: 1,
            world: {
                a: 'wrong',
                c: 'd'
            }
        },
        {
            hello: 1,
            world: {
                a: 'wrong',
                c: 'd'
            }
        }
    ];
    IgnoreKeys_1.IgnoreKeys.process([
        {
            '*': 'world.a'
        }
    ], actual, expected);
    t.deepEqual(actual, expected);
});
//# sourceMappingURL=ignoreKeysTest.js.map