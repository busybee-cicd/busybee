"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var _async = require("async");
var _ = require("lodash");
var Logger_1 = require("../lib/Logger");
var RESTClient_1 = require("../lib/RESTClient");
var TestSetResult_1 = require("../models/results/TestSetResult");
var RESTSuiteManager = /** @class */ (function () {
    function RESTSuiteManager(conf, suiteEnvConf) {
        this.conf = conf;
        this.logger = new Logger_1.Logger(conf, this);
        this.restClient = new RESTClient_1.RESTClient(conf, suiteEnvConf);
    }
    ///////// TestRunning
    RESTSuiteManager.prototype.runRESTApiTestSets = function (currentEnv) {
        var _this = this;
        // TODO: logic for running TestSets in order
        return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            var testSetPromises, testSetResults, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.trace("runRESTApiTestSets " + currentEnv.suiteID + " " + currentEnv.suiteEnvID);
                        testSetPromises = _.map(currentEnv.testSets.values(), function (testSet) {
                            return _this.runRESTApiTestSet(currentEnv, testSet);
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, Promise.all(testSetPromises)];
                    case 2:
                        testSetResults = _a.sent();
                        resolve(testSetResults);
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        this.logger.trace("runRESTApiTestSets ERROR encountered while running testSetPromises");
                        return [2 /*return*/, reject(e_1)];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
    };
    RESTSuiteManager.prototype.runRESTApiTestSet = function (currentEnv, testSet) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                this.logger.trace("runRESTApiTestSet " + currentEnv.ports + " " + testSet.id);
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        // build api test functions
                        if (!testSet.tests) {
                            reject("testSet " + testSet.id + " has no tests");
                            return;
                        }
                        var testFns = _this.buildTestTasks(currentEnv, testSet);
                        // run api test functions
                        _this.logger.info("Running Test Set: " + testSet.id);
                        if (testSet.description) {
                            _this.logger.info("" + testSet.description);
                        }
                        _async.series(testFns, function (err2, testResults) {
                            // see if any tests failed and mark the set according
                            var pass = _.find(testResults, function (tr) { return tr.pass === false; }) ? false : true;
                            var testSetResult = new TestSetResult_1.TestSetResult();
                            testSetResult.pass = pass;
                            testSetResult.id = testSet.id;
                            testSetResult.tests = testResults;
                            // let testSetResults = {
                            //   pass: pass,
                            //   id: testSet.id,
                            //   tests: testResults
                            // };
                            if (err2) {
                                _this.logger.trace('runRESTApiTestSet ERROR while running tests');
                                _this.logger.trace(err2);
                                reject(err2);
                            }
                            else {
                                resolve(testSetResult);
                            }
                        });
                    })];
            });
        });
    };
    RESTSuiteManager.prototype.buildTestTasks = function (currentEnv, testSet) {
        var _this = this;
        this.logger.trace("RESTSuiteManager:buildTestTasks <testSet> " + currentEnv.ports);
        this.logger.trace(testSet);
        // filter out any tests that do no contain a request object (usually the case if a
        var testsWithARequest = _.reject(testSet.tests, function (test) { return test === null; });
        return _.map(testsWithARequest, function (test) {
            return function (cb) {
                // build request
                var port = currentEnv.ports[0]; // the REST api port should be passed first in the userConfigFile.
                var opts = _this.restClient.buildRequest(test.request, port);
                _this.logger.trace(opts);
                // figure out if this test is running at a specific index. (just nice for consoling)
                var testIndex;
                if (_.isUndefined(test.testSet)) {
                    testIndex = '#';
                }
                else {
                    // we have more than one testSet configuration for this test. find the one
                    // matching the current testSet
                    var testSetConf = test.testSet;
                    if (Array.isArray(testSetConf)) {
                        testSetConf = _.find(testSetConf, function (c) {
                            return c.id == testSet.id;
                        });
                    }
                    if (_.isUndefined(testSetConf.index)) {
                        testIndex = '#';
                    }
                    else {
                        testIndex = testSetConf.index;
                    }
                    ;
                }
                _this.logger.info(testSet.id + ": " + testIndex + ": " + test.id);
                _this.restClient.makeRequest(opts, function (err, res, body) {
                    if (err) {
                        return cb(err);
                    }
                    _this.validateTestResult(test, opts, res, body, cb);
                });
            };
        });
    };
    RESTSuiteManager.prototype.validateTestResult = function (test, reqOpts, res, body, cb) {
        this.logger.trace("validateTestResult");
        // validate results
        var testResult = {
            id: test.id,
            index: test.testIndex,
            pass: true
        };
        if (test.expect.headers) {
            testResult.headers = [];
            _.forEach(test.expect.headers, function (v, headerName) {
                if (res.headers[headerName] != v) {
                    testResult.pass = false;
                    testResult.headers.push({
                        pass: false,
                        headerName: headerName,
                        actual: res.headers[headerName],
                        expected: v
                    });
                    testResult.headers[headerName] = "Expected " + v + " was " + res.headers[headerName];
                }
                else {
                    testResult.headers.push({
                        pass: true,
                        headerName: headerName
                    });
                }
            });
        }
        if (test.expect.status) {
            testResult.status = {
                pass: true
            };
            var statusPass = res.statusCode == test.expect.status;
            if (!statusPass) {
                testResult.pass = false;
                testResult.status.pass = false;
                testResult.status.actual = res.statusCode;
                testResult.status.expected = test.expect.status;
            }
        }
        if (test.expect.body) {
            testResult.body = {
                pass: true
            };
            var bodyPass = true;
            if (_.isFunction(test.expect.body)) {
                // if the test has a custom function for assertion, run it.
                try {
                    bodyPass = test.expect.body(body);
                    if (!_.isBoolean(bodyPass)) {
                        bodyPass = false;
                    }
                }
                catch (e) {
                    bodyPass = false;
                }
            }
            else {
                // assert the body against the provided pojo body
                bodyPass = _.isEqual(body, test.expect.body);
            }
            if (!bodyPass) {
                testResult.pass = false;
                testResult.body.pass = false;
                testResult.body.actual = body;
                testResult.body.expected = _.isFunction(test.expect.body) ? 'custom assertion function' : test.expect.body;
            }
        }
        // attach the request info if the test itself failed
        if (!testResult.pass) {
            testResult.request = reqOpts;
        }
        cb(null, testResult);
    };
    return RESTSuiteManager;
}());
exports.RESTSuiteManager = RESTSuiteManager;
//# sourceMappingURL=RESTSuiteManager.js.map