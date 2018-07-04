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
var Logger_1 = require("../../src/lib/Logger");
var IOHelper_1 = require("../../src/lib/IOHelper");
var IgnoreKeys_1 = require("../../src/lib/assertionModifications/IgnoreKeys");
var busybee = path.join(__dirname, '../../dist/src/index.js');
var logger = new Logger_1.Logger({}, { constructor: { name: 'IT' } });
ava_1.default("happy path simple", function (t) {
    return new Promise(function (resolve, reject) {
        var returned = false;
        var testCmd = child_process_1.spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/happy-path-simple'), '-D']);
        var expected = [{ "testSets": [{ "pass": true, "id": "ts1", "tests": [{ "pass": true, "id": "body assertion", "status": { "pass": true, "actual": 200 }, "headers": { "pass": true, "actual": [{ "content-type": "application/json" }, { "date": "Wed, 04 Jul 2018 15:15:16 GMT" }, { "connection": "close" }, { "transfer-encoding": "chunked" }], "expected": [] }, "body": { "pass": true, "actual": { "hello": "world", "object": { "1": "2", "arr": [1, 3, 4], "nested": { "im": "nested", "arr": [1, 2, 3, 4] } }, "arr": [1, 2, 3] } }, "request": { "json": true, "method": "GET", "url": "http://localhost:7777/body-assertion", "timeout": 30000, "resolveWithFullResponse": true, "simple": false } }, { "pass": true, "id": "status assertion", "status": { "pass": true, "actual": 404 }, "headers": { "pass": true, "actual": [{ "content-type": "application/json" }, { "date": "Wed, 04 Jul 2018 15:15:16 GMT" }, { "connection": "close" }, { "transfer-encoding": "chunked" }], "expected": [] }, "body": { "pass": true }, "request": { "json": true, "method": "GET", "url": "http://localhost:7777/status-assertion", "timeout": 30000, "resolveWithFullResponse": true, "simple": false } }] }], "pass": true, "type": "REST", "id": "Happy Path" }];
        var actual;
        testCmd.stdout.on('data', function (data) {
            var lines = IOHelper_1.IOHelper.parseDataBuffer(data);
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
ava_1.default("env start failure", function (t) { return __awaiter(_this, void 0, void 0, function () {
    var assertions, testCmd, actual;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                assertions = {
                    'BUSYBEE_ERROR detected': 2,
                    'Stopping Environment: Env That Will Fail To Start (1)': 1,
                    'Stopping Environment: Env That Will Fail To Start (2)': 1,
                    'Stopping Environment: Env That Starts Successfully (1)': 1,
                    'Stopping Environment: Env That Starts Successfully (2)': 1,
                    'Tests finished in': 1
                };
                testCmd = child_process_1.spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/env-start-failure')]);
                return [4 /*yield*/, analyzeOutput(testCmd, assertions)];
            case 1:
                actual = _a.sent();
                t.deepEqual(actual, assertions);
                return [2 /*return*/];
        }
    });
}); });
/*
  looks for occurrences of strings in a stdout stream of a child process
  when given an assertions object {stringToFind: numberOfOccurrences}
*/
function analyzeOutput(childProcess, assertions) {
    return new Promise(function (resolve, reject) {
        var actual = {};
        childProcess.stdout.on('data', function (data) {
            var lines = IOHelper_1.IOHelper.parseDataBuffer(data);
            lines.forEach(function (l) {
                var found = Object.keys(assertions).find(function (k) {
                    return l.includes(k);
                });
                if (found) {
                    if (!actual[found]) {
                        actual[found] = 0;
                    }
                    actual[found] += 1;
                }
            });
        });
        childProcess.on('close', function () {
            resolve(actual);
        });
    });
}
//# sourceMappingURL=index.js.map