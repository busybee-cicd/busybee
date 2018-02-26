"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var UnorderedCollections_1 = require("../../src/lib/assertionModifications/UnorderedCollections");
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
    },
];
UnorderedCollections_1.UnorderedCollections.process(['subCollection', '.'], expected, actual);
//# sourceMappingURL=unorderedCollections.js.map