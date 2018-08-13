"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var FilePathsConfig = /** @class */ (function () {
    function FilePathsConfig(cmdOpts) {
        var opts = Object.assign({}, cmdOpts);
        var dir = opts.directory ? opts.directory : 'busybee';
        var cFile = opts.config ? opts.config : 'config.js';
        this.busybeeDir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
        this.userConfigFile = path.join(this.busybeeDir, cFile);
    }
    return FilePathsConfig;
}());
exports.FilePathsConfig = FilePathsConfig;
//# sourceMappingURL=FilePathsConfig.js.map