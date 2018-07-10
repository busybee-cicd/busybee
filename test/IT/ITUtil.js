"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var IOUtil_1 = require("../../src/lib/IOUtil");
var ITUtil = /** @class */ (function () {
    function ITUtil() {
    }
    /*
    looks for occurrences of strings in a stdout stream of a child process
    when given an assertions object {stringToFind: numberOfOccurrences}
    */
    ITUtil.analyzeOutputFrequency = function (childProc, assertions) {
        return new Promise(function (resolve, reject) {
            var actual = {};
            childProc.stdout.on('data', function (data) {
                var lines = IOUtil_1.IOUtil.parseDataBuffer(data);
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
            childProc.on('close', function () {
                resolve(actual);
            });
        });
    };
    /*
    reads from stdout and shifts entries out of the provided array as they are encountered.
    if all items are encountered in the order in which they appear in the stdout stream then the
    collection should be empty when resolved
    */
    ITUtil.expectInOrder = function (childProc, expect, t, startsWith) {
        if (startsWith === void 0) { startsWith = false; }
        return new Promise(function (resolve, reject) {
            var returned = false;
            childProc.stdout.on('data', function (data) {
                var lines = IOUtil_1.IOUtil.parseDataBuffer(data);
                lines.forEach(function (l) {
                    if (startsWith) {
                        if (l.startsWith(expect[0])) {
                            expect.shift();
                        }
                    }
                    else {
                        if (l === expect[0]) {
                            expect.shift();
                        }
                    }
                });
            });
            childProc.stderr.on('data', function (data) {
                if (!returned) {
                    t.log(data.toString());
                    returned = true;
                    t.fail();
                    childProc.kill('SIGHUP');
                    resolve(expect);
                }
            });
            childProc.on('close', function () {
                if (!returned) {
                    returned = true;
                    resolve(expect);
                }
            });
        });
    };
    return ITUtil;
}());
exports.ITUtil = ITUtil;
//# sourceMappingURL=ITUtil.js.map