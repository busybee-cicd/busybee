"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * A TestSet is a logical grouping of tests. One or more TestSets can be assigned to an environment instance.
 * Tests can be run in a specific order with-in a TestSet (see RESTTest.testSet)
 *
 * {<br>
 * &nbsp; id: 'users',<br>
 * &nbsp; controlFlow: 'parallel',<br>
 * &nbsp; runData: {<br>
 * &nbsp; &nbsp; user: 'admin',<br>
 * &nbsp; },<br>
 * &nbsp; description: 'runs all User CRUD tests'<br>
 * }
 */
var TestSetConfig = /** @class */ (function () {
    function TestSetConfig() {
        this.id = void 0;
        this.controlFlow = void 0;
        this.runData = void 0;
        this.description = void 0;
    }
    return TestSetConfig;
}());
exports.TestSetConfig = TestSetConfig;
//# sourceMappingURL=TestSetConfig.js.map