"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var Logger = /** @class */ (function () {
    function Logger(conf, clazz) {
        this.conf = conf;
        this.className = clazz.constructor.name;
        this.logLevel = conf.logLevel || Logger.INFO;
        this.logLevel = this.logLevel.toUpperCase();
        this.levelMap = {
            'TRACE': 0,
            'DEBUG': 1,
            'INFO': 2,
            'WARN': 3,
            'ERROR': 4
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
        this.write(Logger.DEBUG, message, pretty);
    };
    Logger.prototype.info = function (message, pretty) {
        if (pretty === void 0) { pretty = false; }
        this.write(Logger.INFO, message, pretty);
    };
    Logger.prototype.warn = function (message, pretty) {
        if (pretty === void 0) { pretty = false; }
        this.write(Logger.WARN, message, pretty);
    };
    Logger.prototype.error = function (message, pretty) {
        if (pretty === void 0) { pretty = false; }
        this.write(Logger.ERROR, message, pretty);
    };
    Logger.prototype.trace = function (message, pretty) {
        if (pretty === void 0) { pretty = false; }
        this.write(Logger.TRACE, message, pretty);
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
            if (this.logLevel === Logger.DEBUG || this.logLevel === Logger.TRACE) {
                level = level + ":" + this.className + ":";
            }
            console.log(level);
            console.log(message);
        }
        else {
            if (this.logLevel === Logger.DEBUG || this.logLevel === Logger.TRACE) {
                console.log(level + ":" + this.className + ": " + message);
            }
            else {
                console.log(level + ": " + message);
            }
        }
    };
    Logger.TRACE = 'TRACE';
    Logger.DEBUG = 'DEBUG';
    Logger.INFO = 'INFO';
    Logger.WARN = 'WARN';
    Logger.ERROR = 'ERROR';
    Logger.validLevels = [Logger.TRACE, Logger.DEBUG, Logger.INFO, Logger.WARN, Logger.ERROR];
    return Logger;
}());
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map