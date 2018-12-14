"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var TestSuiteResultSummary_1 = require("./TestSuiteResultSummary");
var _ = require("lodash");
var TestSuiteResult = /** @class */ (function () {
    function TestSuiteResult(id, type, testSets, pass) {
        this.testSets = [];
        this.pass = true;
        this.summary = new TestSuiteResultSummary_1.TestSuiteResultSummary();
        this.id = id;
        this.type = type;
        this.pass = pass;
        this.addTestSets(testSets);
    }
    TestSuiteResult.prototype.addEnvResult = function (envResult) {
        this.addTestSets(envResult.testSets);
    };
    TestSuiteResult.prototype.addTestSets = function (newTestSets) {
        // update the summary and add the testSetResults to the testSets collection
        for (var _i = 0, newTestSets_1 = newTestSets; _i < newTestSets_1.length; _i++) {
            var tsResult = newTestSets_1[_i];
            this.summary.numberOfTestSets += 1;
            this.testSets.push(tsResult);
            if (!tsResult.pass) {
                this.pass = false;
            }
            // if type is REST then track individual test stats (for now)
            if (this.type === "REST") {
                this.summary.numberOfTests += tsResult.tests.length;
                if (tsResult.pass) {
                    // if the ts is marked as pass then all of the tests passed too
                    this.summary.numberOfPassedTests += tsResult.tests.length;
                }
                else {
                    var passedTests = _.filter(tsResult.tests, function (t) { return t.pass === true; });
                    this.summary.numberOfPassedTests += passedTests.length;
                }
            }
        }
    };
    return TestSuiteResult;
}());
exports.TestSuiteResult = TestSuiteResult;
//# sourceMappingURL=TestSuiteResult.js.map