"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var json_typescript_mapper_1 = require("json-typescript-mapper");
var BusybeeUserConfig_1 = require("../models/config/BusybeeUserConfig");
var BusybeeParsedConfig_1 = require("../models/config/BusybeeParsedConfig");
var FilePathsConfig_1 = require("../models/config/parsed/FilePathsConfig");
var ConfigParser = /** @class */ (function () {
    function ConfigParser(cmdOpts) {
        this.filePaths = new FilePathsConfig_1.FilePathsConfig(cmdOpts);
        this.cmdOpts = cmdOpts;
    }
    ConfigParser.prototype.parse = function (mode) {
        var userConfig = json_typescript_mapper_1.deserialize(BusybeeUserConfig_1.BusybeeUserConfig, require(this.filePaths.userConfigFile));
        return new BusybeeParsedConfig_1.BusybeeParsedConfig(userConfig, this.cmdOpts, mode);
    };
    return ConfigParser;
}());
exports.ConfigParser = ConfigParser;
//# sourceMappingURL=ConfigParser.js.map