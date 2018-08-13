"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * A TestSet is a logical grouping of tests. One or more TestSets can be assigned to an environment instance.
 * Tests can be run in a specific order with-in a TestSet (see RESTTest.testSet)
 * ```
 * {
 *   id: 'users',
 *   controlFlow: 'parallel',
 *   runData: {
 *     user: 'admin',
 *   },
 *   description: 'runs all User CRUD tests'
 * }
 * ```
 */
var TestSetConfig = /** @class */ (function () {
    function TestSetConfig() {
        this.id = void 0;
        this.controlFlow = void 0;
        this.runData = void 0;
        this.description = void 0;
        this.assertion = void 0;
    }
    return TestSetConfig;
}());
exports.TestSetConfig = TestSetConfig;
//# sourceMappingURL=TestSetConfig.js.map