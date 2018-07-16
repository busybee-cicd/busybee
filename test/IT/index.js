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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var ava_1 = require("ava");
var child_process_1 = require("child_process");
var path = require("path");
var IOUtil_1 = require("../../src/lib/IOUtil");
var IgnoreKeys_1 = require("../../src/lib/assertionModifications/IgnoreKeys");
var ITUtil_1 = require("./ITUtil");
var http = require("http");
var busybee = path.join(__dirname, '../../dist/src/index.js');
/**
 * .serial modifier will force this test to run by itself. need this since we check for specific ports to be used
 * in the response.
 */
ava_1.default.serial("REST happy path", function (t) {
    return new Promise(function (resolve, reject) {
        var returned = false;
        var testCmd = child_process_1.spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/REST-happy-path')]);
        var expected = [{ "testSets": [{ "pass": true, "id": "ts1", "tests": [{ "pass": true, "id": "body assertion", "status": { "pass": true, "actual": 200 }, "headers": { "pass": true, "actual": [{ "content-type": "application/json" }, { "date": "Wed, 04 Jul 2018 15:15:16 GMT" }, { "connection": "close" }, { "transfer-encoding": "chunked" }], "expected": [] }, "body": { "pass": true, "actual": { "hello": "world", "object": { "1": "2", "arr": [1, 3, 4], "nested": { "im": "nested", "arr": [1, 2, 3, 4] } }, "arr": [1, 2, 3] } }, "request": { "json": true, "method": "GET", "url": "http://localhost:7777/body-assertion", "timeout": 30000, "resolveWithFullResponse": true, "simple": false } }, { "pass": true, "id": "status assertion", "status": { "pass": true, "actual": 404 }, "headers": { "pass": true, "actual": [{ "content-type": "application/json" }, { "date": "Wed, 04 Jul 2018 15:15:16 GMT" }, { "connection": "close" }, { "transfer-encoding": "chunked" }], "expected": [] }, "body": { "pass": true }, "request": { "json": true, "method": "GET", "url": "http://localhost:7777/status-assertion", "timeout": 30000, "resolveWithFullResponse": true, "simple": false } }] }], "pass": true, "type": "REST", "id": "REST Happy Path" }];
        var actual;
        testCmd.stdout.on('data', function (data) {
            var lines = IOUtil_1.IOUtil.parseDataBuffer(data);
            lines.forEach(function (l) {
                if (l.startsWith('RESULTS:')) {
                    actual = JSON.parse(l.replace('RESULTS: ', ''));
                }
            });
        });
        testCmd.stderr.on('data', function (data) {
            if (!returned) {
                returned = true;
                t.fail();
                testCmd.kill('SIGHUP');
                resolve();
            }
        });
        testCmd.on('close', function () {
            if (!returned) {
                returned = true;
                // remove the nested 'date' property from actual/expected since this will be different each run
                IgnoreKeys_1.IgnoreKeys.process(['*.testSets.tests.headers.actual.date'], expected, actual);
                t.deepEqual(actual, expected);
                resolve();
            }
        });
    });
});
ava_1.default("tests run in order", function (t) { return __awaiter(_this, void 0, void 0, function () {
    var testCmd, expected, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                testCmd = child_process_1.spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/REST-tests-run-in-order')]);
                expected = [
                    'INFO: Running Test Set: ts1',
                    'INFO: ts1: 0: test at index: 0',
                    'INFO: ts1: 1: test at index: 1',
                    'INFO: ts1: 2: test at index: 2',
                    'INFO: ts1: 3: test at index: 3',
                    'INFO: ts1: 4: test at index: 4',
                    'INFO: ts1: #: implicitly ordered 1',
                    'INFO: ts1: #: implicitly ordered 2',
                    'INFO: ts1: #: implicitly ordered 3'
                ];
                return [4 /*yield*/, ITUtil_1.ITUtil.expectInOrder(testCmd, expected, t)];
            case 1:
                result = _a.sent();
                t.is(result.length, 0);
                return [2 /*return*/];
        }
    });
}); });
ava_1.default("env start failure", function (t) { return __awaiter(_this, void 0, void 0, function () {
    var expected, testCmd, actual;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                expected = {
                    'BUSYBEE_ERROR detected': 2,
                    'Stopping Environment: Env That Will Fail To Start (1)': 1,
                    'Stopping Environment: Env That Will Fail To Start (2)': 1,
                    'Stopping Environment: Env That Starts Successfully (1)': 1,
                    'Stopping Environment: Env That Starts Successfully (2)': 1,
                    'Tests finished in': 1
                };
                testCmd = child_process_1.spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/env-start-failure')]);
                return [4 /*yield*/, ITUtil_1.ITUtil.analyzeOutputFrequency(testCmd, expected)];
            case 1:
                actual = _a.sent();
                t.deepEqual(actual, expected);
                return [2 /*return*/];
        }
    });
}); });
/**
 * .serial modifier will force this test to run by itself to ensure ports aren't being reserved. need this since
 * we're asserting specific ports
 */
ava_1.default("ports in use", function (t) { return __awaiter(_this, void 0, void 0, function () {
    var _this = this;
    var server, childEnv, testCmd, expected, actual;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                server = http.createServer();
                server.listen(7777);
                // wait for service to begin listening
                return [4 /*yield*/, new Promise(function (resolve, reject) {
                        server.on('listening', function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                resolve();
                                return [2 /*return*/];
                            });
                        }); });
                        server.on('error', function (err) {
                            reject(err);
                        });
                    })];
            case 1:
                // wait for service to begin listening
                _a.sent();
                childEnv = Object.assign({}, process.env, { BUSYBEE_LOG_LEVEL: 'TRACE' });
                testCmd = child_process_1.spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/ports-in-use')], { env: childEnv });
                expected = {
                    'TRACE:EnvManager: arePortsInUseByBusybee  | 7777,7778': 1,
                    'TRACE:EnvManager: 7778 is available': 2,
                    'TRACE:EnvManager: 7777 is in use': 1,
                    'TRACE:EnvManager: ports identified: {"ports":[7778,7779],"portOffset":1}': 1,
                    'TRACE:EnvManager: ports identified: {"ports":[7780,7781],"portOffset":3}': 1,
                    'INFO:Object: Tests finished in': 1
                };
                return [4 /*yield*/, ITUtil_1.ITUtil.analyzeOutputFrequency(testCmd, expected)];
            case 2:
                actual = _a.sent();
                t.deepEqual(actual, expected);
                // shut down server holding 7777
                return [4 /*yield*/, new Promise(function (resolve, reject) {
                        server.close(function (err) {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve();
                            }
                        });
                    })];
            case 3:
                // shut down server holding 7777
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
/**
 *
 */
ava_1.default("USER_PROVIDED happy path", function (t) { return __awaiter(_this, void 0, void 0, function () {
    var testCmd, expected, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                testCmd = child_process_1.spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/USER_PROVIDED-happy-path'), '-D']);
                expected = [
                    'DEBUG:EnvManager: startData is neat',
                    'DEBUG:EnvManager: runData rules',
                    'DEBUG:EnvManager: stopData is also neat',
                    'RESULTS: [{"pass":true}]'
                ];
                return [4 /*yield*/, ITUtil_1.ITUtil.expectInOrder(testCmd, expected, t)];
            case 1:
                result = _a.sent();
                t.is(result.length, 0);
                return [2 /*return*/];
        }
    });
}); });
function sleep(ms) {
    if (ms === void 0) { ms = 0; }
    return new Promise(function (r) { return setTimeout(r, ms); });
}
//# sourceMappingURL=index.js.map