"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var Logger_1 = require("./Logger");
var json_typescript_mapper_1 = require("json-typescript-mapper");
var BusybeeUserConfig_1 = require("../config/BusybeeUserConfig");
var BusybeeParsedConfig_1 = require("../config/BusybeeParsedConfig");
var FilePathsConfig_1 = require("../config/parsed/FilePathsConfig");
var ConfigParser = /** @class */ (function () {
    function ConfigParser(cmdOpts) {
        this.filePaths = new FilePathsConfig_1.FilePathsConfig(cmdOpts);
        this.cmdOpts = cmdOpts;
        this.logLevel = this.getLogLevel(cmdOpts);
        this.logger = new Logger_1.Logger({ logLevel: this.logLevel }, this);
    }
    ConfigParser.prototype.getLogLevel = function (cmdOpts) {
        var logLevel;
        if (process.env.BUSYBEE_DEBUG) {
            logLevel = 'DEBUG';
        }
        else if (process.env.BUSYBEE_LOG_LEVEL) {
            if (Logger_1.Logger.isLogLevel(process.env.BUSYBEE_LOG_LEVEL)) {
                logLevel = process.env.BUSYBEE_LOG_LEVEL;
            }
        }
        else if (cmdOpts) {
            if (this.cmdOpts.debug) {
                logLevel = 'DEBUG';
            }
            else if (cmdOpts.logLevel) {
                if (Logger_1.Logger.isLogLevel(cmdOpts.logLevel)) {
                    logLevel = cmdOpts.logLevel;
                }
            }
        }
        process.env.BUSYBEE_LOG_LEVEL = logLevel;
        return logLevel;
    };
    ConfigParser.prototype.parse = function (mode) {
        var userConfig = json_typescript_mapper_1.deserialize(BusybeeUserConfig_1.BusybeeUserConfig, JSON.parse(fs.readFileSync(this.filePaths.userConfigFile, 'utf8')));
        this.parsedConfig = new BusybeeParsedConfig_1.BusybeeParsedConfig(userConfig, this.cmdOpts, mode);
        return this.parsedConfig;
    };
    return ConfigParser;
}());
exports.ConfigParser = ConfigParser;
//# sourceMappingURL=ConfigParser.js.map