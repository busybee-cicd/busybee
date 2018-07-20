"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var IOUtil_1 = require("../../../src/lib/IOUtil");
var ITUtil = /** @class */ (function () {
    function ITUtil() {
    }
    /**
     * looks for occurrences of strings in a stdout stream of a child process
     * when given an assertions object {stringToFind: numberOfOccurrences}
     *
     * @param childProc
     * @param assertions
     * @param logger
     */
    ITUtil.analyzeOutputFrequency = function (childProc, assertions, logger) {
        if (logger === void 0) { logger = null; }
        return new Promise(function (resolve, reject) {
            var actual = {};
            childProc.stdout.on('data', function (data) {
                var lines = IOUtil_1.IOUtil.parseDataBuffer(data);
                lines.forEach(function (l) {
                    if (logger) {
                        logger.debug(l);
                    }
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
                if (logger) {
                    logger.debug('child process closing');
                }
                resolve(actual);
            });
        });
    };
    /**
     *
     * reads from stdout and shifts entries out of the provided array as they are encountered.
     * if all items are encountered in the order in which they appear in the stdout stream then the
     * collection should be empty when resolved
     *
     * @param childProc
     * @param expect
     * @param t
     * @param startsWith
     * @param logger
     */
    ITUtil.expectInOrder = function (childProc, expect, t, startsWith, logger) {
        if (startsWith === void 0) { startsWith = false; }
        if (logger === void 0) { logger = null; }
        return new Promise(function (resolve, reject) {
            var returned = false;
            childProc.stdout.on('data', function (data) {
                var lines = IOUtil_1.IOUtil.parseDataBuffer(data);
                lines.forEach(function (l) {
                    if (logger) {
                        logger.debug(l);
                    }
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
                    if (logger) {
                        logger.debug(data.toString());
                    }
                    returned = true;
                    childProc.kill('SIGHUP');
                    resolve(expect);
                }
            });
            childProc.on('close', function () {
                if (!returned) {
                    if (logger) {
                        logger.debug('child process closing');
                    }
                    returned = true;
                    resolve(expect);
                }
            });
        });
    };
    /**
     * waits for a provided string to appear in stdout and then resolves
     *
     * @param childProc
     * @param target
     * @param t
     * @param startsWith
     * @param logger
     */
    ITUtil.waitFor = function (childProc, target, t, startsWith, logger) {
        if (startsWith === void 0) { startsWith = false; }
        if (logger === void 0) { logger = null; }
        return new Promise(function (resolve, reject) {
            var returned = false;
            childProc.stdout.on('data', function (data) {
                var lines = IOUtil_1.IOUtil.parseDataBuffer(data);
                lines.forEach(function (l) {
                    if (logger) {
                        logger.debug(l);
                    }
                    if (startsWith) {
                        if (l.startsWith(target)) {
                            resolve();
                        }
                    }
                    else {
                        if (l === target) {
                            resolve();
                        }
                    }
                });
            });
            childProc.stderr.on('data', function (data) {
                if (!returned) {
                    var msg = data.toString();
                    if (logger) {
                        logger.debug(msg);
                    }
                    returned = true;
                    t.fail(msg);
                    childProc.kill('SIGHUP');
                    reject(msg);
                }
            });
            childProc.on('close', function () {
                if (!returned) {
                    if (logger) {
                        logger.debug('child process closing');
                    }
                    returned = true;
                    resolve();
                }
            });
        });
    };
    return ITUtil;
}());
exports.ITUtil = ITUtil;
//# sourceMappingURL=ITUtil.js.map