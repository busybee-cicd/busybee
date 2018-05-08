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
var IgnoreKeys_1 = require("../lib/assertionModifications/IgnoreKeys");
var UnorderedCollections_1 = require("../lib/assertionModifications/UnorderedCollections");
var RESTTestResult_1 = require("../models/results/RESTTestResult");
// support JSON.stringify on Error objects
if (!('toJSON' in Error.prototype))
    Object.defineProperty(Error.prototype, 'toJSON', {
        value: function () {
            var alt = {};
            Object.getOwnPropertyNames(this).forEach(function (key) {
                alt[key] = this[key];
            }, this);
            return alt;
        },
        configurable: true,
        writable: true
    });
var RESTSuiteManager = /** @class */ (function () {
    function RESTSuiteManager(conf, suiteEnvConf) {
        this.conf = _.cloneDeep(conf);
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
                        var controlFlow = testSet.controlFlow || "series";
                        _this.logger.debug(testSet.id + ": controlFlow = " + controlFlow);
                        _async[controlFlow](testFns, function (err2, testResults) {
                            // see if any tests failed and mark the set according
                            var pass = _.find(testResults, function (tr) {
                                return tr.pass === false;
                            }) ? false : true;
                            var testSetResult = new TestSetResult_1.TestSetResult();
                            testSetResult.pass = pass;
                            testSetResult.id = testSet.id;
                            testSetResult.tests = testResults;
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
        // filter out tests that do not contain .request object (shouldnt be required anymore) TODO: remove?
        var testsWithARequest = _.reject(testSet.tests, function (test) {
            if (_.isNil(test)) {
                _this.logger.trace("TestSet with NULL test detected");
            }
            return _.isNil(test);
        });
        return _.map(testsWithARequest, function (test) {
            return function (cb) { return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                var port, opts, testIndex, testSetConf;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            port = currentEnv.ports[0];
                            opts = this.restClient.buildRequest(test.request, port);
                            // filter everything in the request opts for variables that should be set via variableExports
                            this.logger.trace('opts before processRequestOptsForVariableDeclarations');
                            this.logger.trace(opts);
                            opts = this.processRequestOptsForVariableDeclarations(opts, testSet.variableExports);
                            this.logger.trace('opts after processRequestOptsForVariableDeclarations');
                            this.logger.trace(opts);
                            if (_.isUndefined(test.testSet)) {
                                testIndex = '#';
                            }
                            else {
                                testSetConf = test.testSet;
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
                            this.logger.info(testSet.id + ": " + testIndex + ": " + test.id);
                            if (!test.delayTestRequest) return [3 /*break*/, 2];
                            this.logger.info("Delaying request for " + test.delayTestRequest / 1000 + " seconds.");
                            return [4 /*yield*/, this.wait(test.delayTestRequest)];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            this.restClient.makeRequest(opts, function (err, res, body) {
                                if (err) {
                                    _this.logger.error(err, true);
                                    var testResult = new RESTTestResult_1.RESTTestResult(test.id);
                                    testResult.pass = false;
                                    testResult.body.pass = false;
                                    testResult.body.error = {
                                        type: 'error during request',
                                        error: err.message,
                                        stack: err.stack
                                    };
                                    testResult.headers.pass = false;
                                    testResult.status.pass = false;
                                    return cb(null, testResult);
                                }
                                _this.validateTestResult(testSet, test, Object.assign({}, _this.restClient.getDefaultRequestOpts(), opts), res, body, cb);
                            });
                            return [2 /*return*/];
                    }
                });
            }); };
        });
    };
    RESTSuiteManager.prototype.wait = function (milliseconds) {
        return new Promise(function (resolve, reject) { return setTimeout(resolve, milliseconds); });
    };
    /*
     Iterates through the request opts and relaces all instances of #{myVar}
     with properties of the same name on variableExports
     */
    RESTSuiteManager.prototype.processRequestOptsForVariableDeclarations = function (opts, variableExports) {
        var _this = this;
        // check url
        opts.url = this.replaceVars(opts.url, variableExports);
        var objBasedPropsToCheck = ['query', 'headers', 'body'];
        objBasedPropsToCheck.forEach(function (prop) {
            if (opts[prop]) {
                opts[prop] = _this.replaceVarsInObject(opts[prop], variableExports);
            }
        });
        return opts;
    };
    RESTSuiteManager.prototype.replaceVarsInObject = function (obj, variableExports) {
        var _this = this;
        if (_.isString(obj)) {
            return this.replaceVars(obj, variableExports);
        }
        _.forEach(obj, function (value, propName) {
            if (_.isObject(value) && !_.isArray(value)) {
                obj[propName] = _this.replaceVarsInObject(value, variableExports);
            }
            else if (_.isArray(value)) {
                obj[propName] = value.map(function (v) {
                    return _this.replaceVarsInObject(v, variableExports);
                });
            }
            else if (_.isString(value)) {
                obj[propName] = _this.replaceVars(value, variableExports);
            }
        });
        return obj;
    };
    /*
     Parses strings formatted as "#{myVar}"
     */
    RESTSuiteManager.prototype.replaceVars = function (str, variableExports) {
        var _this = this;
        // When the string startsWith #{ and endswith }
        // we assume its a literal substitution.
        if (str.startsWith("#{") && str.endsWith("}")) {
            var varName = str.substr(2).slice(0, -1);
            this.logger.trace("Setting literal " + variableExports[varName] + " for '" + varName + "'");
            return variableExports[varName];
        }
        var replaced = str.replace(/#{\w+}/g, function (match) {
            match = match.substr(2).slice(0, -1); // remove #{}
            _this.logger.trace("Setting " + match + " for '" + str + "'");
            _this.logger.trace(variableExports, true);
            if (_.isObject(variableExports[match])) {
                // if the matched variable's value is an object
                // we return a special instruction
                return "OBJECT-" + match;
            }
            return variableExports[match];
        });
        if (replaced.startsWith("OBJECT")) {
            var key = replaced.substr(7);
            replaced = variableExports[key];
        }
        return replaced;
    };
    RESTSuiteManager.prototype.validateTestResult = function (testSet, test, reqOpts, res, body, cb) {
        this.logger.trace("validateTestResult");
        // validate results
        var testResult = new RESTTestResult_1.RESTTestResult(test.id);
        if (test.expect.status) {
            var statusPass = res.statusCode == test.expect.status;
            testResult.status.actual = res.statusCode;
            if (!statusPass) {
                testResult.pass = false;
                testResult.status.pass = false;
                testResult.status.expected = test.expect.status;
            }
        }
        else {
            // return the actual status by default
            testResult.status.actual = res.statusCode;
        }
        if (test.expect.headers) {
            _.forEach(test.expect.headers, function (v, headerName) {
                if (res.headers[headerName] != v) {
                    testResult.pass = false;
                    testResult.headers.pass = false;
                }
                var actual = {};
                actual[headerName] = res.headers[headerName];
                testResult.headers.actual.push(actual);
                var expected = {};
                expected[headerName] = v;
                testResult.headers.expected.push(expected);
            });
        }
        else {
            // return the actual headers by default
            _.forEach(res.headers, function (v, headerName) {
                var actual = {};
                actual[headerName] = v;
                testResult.headers.actual.push(actual);
            });
        }
        if (test.expect.body) {
            var bodyPass = true;
            var customFnErr = null;
            ///////////////////////////
            //  Run Assertions
            ///////////////////////////
            var actual = _.cloneDeep(body);
            var expected = void 0;
            try {
                //  Assertion Modifications
                /*
                 there are some assertion modifications that should alter the actual/expect prior to running an
                 assertion function or doing a direct pojo comparision. run those here
                 */
                if (_.isFunction(test.expect.body)) {
                    /*
                     In the event that 'expect.body' is a custom fn, we'll make 'expected' == 'actual'
                     assertionModification logic relies on 'expected' and 'actual' to both be objects.
                     Ultimately, when the assertions are run the 'expected' object set here will not
                     be used and instead 'test.expect.body(actual)' will be evaluated.
                     */
                    expected = _.cloneDeep(actual);
                }
                else {
                    expected = _.cloneDeep(test.expect.body);
                }
                if (test.expect.assertionModifications) {
                    testResult.assertionModifications = test.expect.assertionModifications;
                    if (test.expect.assertionModifications.ignoreKeys) {
                        IgnoreKeys_1.IgnoreKeys.process(test.expect.assertionModifications.ignoreKeys, expected, actual);
                    }
                    if (test.expect.assertionModifications.unorderedCollections) {
                        this.logger.debug("Processing UnorderedCollections");
                        /*
                         Due to the scenario where unorderedCollections may contain unorderedCollections ie)
                         [
                         {
                         subCollection: [1,2,3,4]
                         },
                         {
                         subCollection: [5,6,7,8]
                         }
                         ]
            
                         We must do a first pass where we work from the outside -> in. We just check for equality while ignoring nested collections.
                         On a second pass we remove the collections so that they don't appear in the body-assertion steps below
                         */
                        UnorderedCollections_1.UnorderedCollections.process(test.expect.assertionModifications.unorderedCollections, expected, actual);
                    }
                }
                // /End Assertion Modifications
                // IMPORTANT: the 'expected' and 'actual' at this point have been modified to remove anything that we should ignore.
                // that is so that keys that don't matter aren't passed to the assertionFn or the _.isEqual
                // Run Custom Function Assertion OR basic Pojo comparision
                if (_.isFunction(test.expect.body)) {
                    // if the test has a custom function for assertion, run it.
                    var bodyResult = test.expect.body(actual, testSet.variableExports);
                    if (bodyResult === false) {
                        bodyPass = false;
                    } // else we pass it. ie) it doesn't return anything we assume it passed.
                }
                else {
                    // assert the body against the provided pojo body
                    bodyPass = _.isEqual(expected, actual);
                }
            }
            catch (e) {
                bodyPass = false;
                customFnErr = {
                    type: 'custom validation function',
                    error: e.message,
                    stack: e.stack
                };
            }
            // actual and expected should return the original info, not mutated by assertionModifications
            testResult.body.actual = actual; // original returned body is never mutated
            if (!bodyPass) {
                testResult.pass = false;
                testResult.body.pass = false;
                testResult.body.expected = expected;
                if (customFnErr) {
                    testResult.body.error = customFnErr;
                }
            }
        }
        else {
            // just return the body that was returned and consider it a pass
            testResult.body.actual = body;
        }
        // attach the request info for reporting purposes
        testResult.request = reqOpts;
        cb(null, testResult);
    };
    return RESTSuiteManager;
}());
exports.RESTSuiteManager = RESTSuiteManager;
//# sourceMappingURL=RESTSuiteManager.js.map