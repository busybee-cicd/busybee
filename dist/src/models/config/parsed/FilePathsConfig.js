"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var FilePathsConfig = /** @class */ (function () {
    function FilePathsConfig(cmdOpts) {
        var dir = cmdOpts.directory ? cmdOpts.directory : 'busybee';
        var cFile = cmdOpts.config ? cmdOpts.config : 'config.js';
        this.busybeeDir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
        this.userConfigFile = path.join(this.busybeeDir, cFile);
    }
    return FilePathsConfig;
}());
exports.FilePathsConfig = FilePathsConfig;
//# sourceMappingURL=FilePathsConfig.js.map