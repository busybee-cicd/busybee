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
var _ = require("lodash");
var Logger_1 = require("../lib/Logger");
var RESTSuiteManager_1 = require("./RESTSuiteManager");
var GenericSuiteManager_1 = require("./GenericSuiteManager");
var EnvResult_1 = require("../models/results/EnvResult");
var TestManager = /** @class */ (function () {
    function TestManager(conf, envManager) {
        this.conf = _.cloneDeep(conf);
        this.logger = new Logger_1.Logger(conf, this);
        this.envManager = envManager;
        this.testSuiteTasks = {};
    }
    TestManager.prototype.buildTestSuiteTasks = function () {
        var _this = this;
        this.logger.trace('buildTestSuiteTasks');
        var conf = this.conf;
        conf.parsedTestSuites.forEach(function (testSuite, suiteID) {
            if (testSuite.skip) {
                return;
            }
            // parse the envs of this TestSuite
            _this.testSuiteTasks[suiteID] = { envTasks: [] };
            //conf.parsedTestSuites[suiteID].envTasks = [];
            _this.logger.trace(suiteID);
            _this.logger.trace(testSuite);
            _this.logger.trace("Processing " + suiteID + " : type = " + testSuite.type);
            testSuite.testEnvs.forEach(function (testEnv, suiteEnvID) {
                _this.logger.trace("testEnv: " + testEnv);
                _this.logger.trace("suiteEnvID: " + suiteEnvID);
                // Check to see if a specific set of envId's has been passed. If so, only run those
                if (_this.conf.getEnvInstancesToRun().length > 0) {
                    if (_this.conf.getEnvInstancesToRun().indexOf(suiteEnvID) === -1) {
                        _this.logger.debug("Skipping envInstance with id " + suiteEnvID);
                        return;
                    }
                }
                if (testSuite.type === 'USER_PROVIDED') {
                    _this.testSuiteTasks[suiteID].envTasks.push(_this.buildTestEnvTask(suiteID, testEnv.suiteEnvID));
                }
                else if (testSuite.type === 'REST' || _.isUndefined(testSuite.type)) {
                    // 1. make sure testSets exist for this testEnv
                    if (_.isEmpty(testEnv.testSets)) {
                        _this.logger.trace("testEnv " + testEnv.suiteEnvID + " contains 0 testSets. skipping");
                        return;
                    }
                    // 2. confirm the testSet contains tests
                    var hasTests_1 = false;
                    testEnv.testSets.forEach(function (testSet) {
                        if (testSet.tests && testSet.tests.length > 0) {
                            hasTests_1 = true;
                            return false;
                        }
                    });
                    if (!hasTests_1) {
                        _this.logger.trace("testEnv " + testEnv.suiteEnvID + " contains 0 tests. skipping");
                        return;
                    }
                    _this.testSuiteTasks[suiteID].envTasks.push(_this.buildRESTTestEnvTask(suiteID, testEnv.suiteEnvID));
                }
            });
        });
    };
    TestManager.prototype.buildRESTTestEnvTask = function (suiteID, suiteEnvID) {
        var _this = this;
        this.logger.trace("buildRESTTestEnvTask " + suiteID + " " + suiteEnvID);
        var generatedEnvID;
        return function (cb) {
            var currentEnv;
            var restManager;
            var testSetResults;
            var _cb = _.once(cb);
            var buildEnvFn = function () { return __awaiter(_this, void 0, void 0, function () {
                var envResult;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            generatedEnvID = this.envManager.generateId();
                            return [4 /*yield*/, this.envManager.start(generatedEnvID, suiteID, suiteEnvID)];
                        case 1:
                            _a.sent();
                            currentEnv = this.envManager.getCurrentEnv(generatedEnvID);
                            // create a restmanager to handle these tests
                            restManager = new RESTSuiteManager_1.RESTSuiteManager(this.conf, currentEnv);
                            return [4 /*yield*/, restManager.runRESTApiTestSets(currentEnv)];
                        case 2:
                            testSetResults = _a.sent(); // returns an array of testSets
                            envResult = new EnvResult_1.EnvResult();
                            envResult.type = 'REST';
                            envResult.suiteID = suiteID;
                            envResult.env = suiteEnvID;
                            envResult.testSets = testSetResults;
                            return [2 /*return*/, envResult];
                    }
                });
            }); };
            buildEnvFn()
                .then(function (envResult) {
                _this.envManager.stop(generatedEnvID)
                    .then(function () {
                    _cb(null, envResult);
                })
                    .catch(function (err) {
                    _cb(err, null);
                });
            })
                .catch(function (err) {
                _this.logger.error("buildRESTTestEnvTask: Error Encountered While Running Tests");
                _this.logger.error(err);
                _this.envManager.stop(generatedEnvID)
                    .then(function () {
                    _cb(err, null);
                })
                    .catch(function (err2) {
                    _cb(err2, null);
                });
            });
        };
    };
    /*
     TODO: use the GenericSuiteManager to kick off tests
     */
    TestManager.prototype.buildTestEnvTask = function (suiteID, suiteEnvID) {
        var _this = this;
        this.logger.trace("buildTestEnvTask " + suiteID + " " + suiteEnvID);
        var generatedEnvID = this.envManager.generateId();
        return function (cb) {
            var buildEnvFn = function () { return __awaiter(_this, void 0, void 0, function () {
                var currentEnv, suiteManager, testSetResults;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.envManager.start(generatedEnvID, suiteID, suiteEnvID)];
                        case 1:
                            _a.sent();
                            currentEnv = this.envManager.getCurrentEnv(generatedEnvID);
                            suiteManager = new GenericSuiteManager_1.GenericSuiteManager(this.conf, currentEnv, this.envManager);
                            return [4 /*yield*/, suiteManager.runTestSets(generatedEnvID)];
                        case 2:
                            testSetResults = _a.sent();
                            return [2 /*return*/, testSetResults];
                    }
                });
            }); };
            buildEnvFn()
                .then(function (testSetResults) {
                _this.logger.trace("TEST SET SUCCESS");
                _this.envManager.stop(generatedEnvID)
                    .then(function () {
                    cb(null, testSetResults);
                })
                    .catch(function (err) {
                    cb(err);
                });
            })
                .catch(function (err) {
                _this.logger.error("buildTestEnvTask: ERROR CAUGHT WHILE RUNNING TEST SETS");
                _this.logger.error(err);
                _this.envManager.stop(generatedEnvID)
                    .then(function () {
                    cb(err);
                })
                    .catch(function (err2) { return cb(err2); });
            });
        };
    };
    return TestManager;
}());
exports.TestManager = TestManager;
//# sourceMappingURL=TestManager.js.map