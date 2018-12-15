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
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
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
var busybee_util_1 = require("busybee-util");
var RESTSuiteManager_1 = require("./RESTSuiteManager");
var GenericSuiteManager_1 = require("./GenericSuiteManager");
var EnvResult_1 = require("../models/results/EnvResult");
var TestWebSocketServer_1 = require("../ws/TestWebSocketServer");
var SuiteType_1 = require("../constants/SuiteType");
var TestManager = /** @class */ (function () {
    function TestManager(conf, envManager) {
        this.conf = _.cloneDeep(conf);
        var loggerConf = new busybee_util_1.LoggerConf(this, conf.logLevel, null);
        this.logger = new busybee_util_1.Logger(loggerConf);
        this.envManager = envManager;
        this.testSuiteTasks = {};
        if (conf.webSocketPort) {
            var wsConf = {
                port: conf.webSocketPort,
                logLevel: conf.logLevel
            };
            this.wsServer = new TestWebSocketServer_1.TestWebSocketServer(wsConf, this.envManager);
        }
    }
    TestManager.prototype.buildTestSuiteTasksPromises = function () {
        var _this = this;
        this.logger.trace('buildTestSuiteTasks');
        var conf = this.conf;
        conf.parsedTestSuites.forEach(function (testSuite, suiteID) {
            if (testSuite.skip) {
                return;
            }
            // parse the envs of this TestSuite
            _this.testSuiteTasks[suiteID] = { envResults: [] };
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
                var envTask;
                if (testSuite.type === SuiteType_1.SuiteType.USER_PROVIDED) {
                    envTask = _this.buildEnvTask(suiteID, testEnv.suiteEnvID, SuiteType_1.SuiteType.USER_PROVIDED);
                    _this.testSuiteTasks[suiteID].envResults.push(envTask);
                }
                else if (testSuite.type === SuiteType_1.SuiteType.REST || _.isUndefined(testSuite.type)) {
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
                    envTask = _this.buildEnvTask(suiteID, testEnv.suiteEnvID, SuiteType_1.SuiteType.REST);
                    _this.testSuiteTasks[suiteID].envResults.push(envTask);
                }
            });
        });
    };
    TestManager.prototype.buildEnvTask = function (suiteID, suiteEnvID, suiteType) {
        return __awaiter(this, void 0, void 0, function () {
            var generatedEnvID, envResult, currentEnv, suiteManager, testSetResults, e_1, e2_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.trace("executeTestEnvTask " + suiteID + " " + suiteEnvID);
                        generatedEnvID = this.envManager.generateId();
                        envResult = EnvResult_1.EnvResult.new(suiteType, suiteID, suiteEnvID);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, 8, 12]);
                        return [4 /*yield*/, this.envManager.start(generatedEnvID, suiteID, suiteEnvID)];
                    case 2:
                        _a.sent();
                        currentEnv = this.envManager.getCurrentEnv(generatedEnvID);
                        suiteManager = void 0;
                        testSetResults = void 0;
                        if (!(suiteType === SuiteType_1.SuiteType.REST)) return [3 /*break*/, 4];
                        suiteManager = new RESTSuiteManager_1.RESTSuiteManager(this.conf, currentEnv);
                        return [4 /*yield*/, suiteManager.runRESTApiTestSets(currentEnv)];
                    case 3:
                        testSetResults = _a.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        suiteManager = new GenericSuiteManager_1.GenericSuiteManager(this.conf, currentEnv, this.envManager);
                        return [4 /*yield*/, suiteManager.runTestSets(generatedEnvID)];
                    case 5:
                        testSetResults = _a.sent();
                        _a.label = 6;
                    case 6:
                        envResult.testSets = testSetResults;
                        return [2 /*return*/, envResult];
                    case 7:
                        e_1 = _a.sent();
                        this.logger.error("buildEnvTask: ERROR CAUGHT WHILE RUNNING TEST SETS");
                        this.logger.error(e_1);
                        envResult.testSets = [];
                        envResult.error = e_1;
                        return [2 /*return*/, envResult];
                    case 8:
                        _a.trys.push([8, 10, , 11]);
                        return [4 /*yield*/, this.envManager.stop(generatedEnvID)];
                    case 9:
                        _a.sent();
                        return [3 /*break*/, 11];
                    case 10:
                        e2_1 = _a.sent();
                        this.logger.error("buildEnvTask: Error Encountered While Stopping " + generatedEnvID);
                        return [3 /*break*/, 11];
                    case 11: return [7 /*endfinally*/];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    TestManager.prototype.getTestWebSockerServer = function () {
        return this.wsServer;
    };
    return TestManager;
}());
exports.TestManager = TestManager;
//# sourceMappingURL=TestManager.js.map