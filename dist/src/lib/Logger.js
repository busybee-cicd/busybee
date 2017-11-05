"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var Logger = /** @class */ (function () {
    function Logger(conf, clazz) {
        this.conf = conf;
        this.className = clazz.constructor.name;
        this.logLevel = conf.logLevel || 'INFO';
        this.logLevel = this.logLevel.toUpperCase();
        this.levelMap = {
            'DEBUG': 0,
            'INFO': 1,
            'WARN': 2,
            'ERROR': 3
        };
    }
    Logger.isLogLevel = function (val) {
        return Logger.validLevels.indexOf(val.toUpperCase()) !== -1 ? true : false;
    };
    Logger.prototype.passesLevel = function (level) {
        return this.levelMap[level] >= this.levelMap[this.logLevel];
    };
    Logger.prototype.debug = function (message, pretty) {
        if (pretty === void 0) { pretty = false; }
        this.write('DEBUG', message, pretty);
    };
    Logger.prototype.info = function (message, pretty) {
        if (pretty === void 0) { pretty = false; }
        this.write('INFO', message, pretty);
    };
    Logger.prototype.warn = function (message, pretty) {
        if (pretty === void 0) { pretty = false; }
        this.write('WARN', message, pretty);
    };
    Logger.prototype.error = function (message, pretty) {
        if (pretty === void 0) { pretty = false; }
        this.write('ERROR', message, pretty);
    };
    Logger.prototype.write = function (level, message, pretty) {
        if (!this.passesLevel(level)) {
            return;
        }
        if (_.isObject(message)) {
            if (pretty) {
                message = JSON.stringify(message, null, '\t');
            }
            else {
                message = JSON.stringify(message);
            }
            if (this.logLevel === 'DEBUG') {
                level = level + ":" + this.className + ":";
            }
            console.log(level);
            console.log(message);
        }
        else {
            if (this.logLevel === 'DEBUG') {
                console.log(level + ":" + this.className + ": " + message);
            }
            else {
                console.log(level + ": " + message);
            }
        }
    };
    Logger.validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    return Logger;
}());
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map