"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ava_1 = require("ava");
var child_process_1 = require("child_process");
var path = require("path");
var Logger_1 = require("../../src/lib/Logger");
var busybee = path.join(__dirname, '../../dist/src/index.js');
var logger = new Logger_1.Logger({}, { constructor: { name: 'IT' } });
ava_1.default("happy path simple", function (t) {
    return new Promise(function (resolve, reject) {
        var returned = false;
        var testCmd = child_process_1.spawn(busybee, ['test', '-d', path.join(__dirname, 'happy-path-simple'), '-D']);
        testCmd.stderr.on('data', function (data) {
            logger.info(data.toString());
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
                t.pass();
                resolve();
            }
        });
    });
});
//# sourceMappingURL=index.js.map