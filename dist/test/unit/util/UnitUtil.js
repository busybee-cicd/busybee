"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ConfigParser_1 = require("../../../src/lib/ConfigParser");
var RESTSuiteManager_1 = require("../../../src/managers/RESTSuiteManager");
var SuiteEnvInfo_1 = require("../../../src/lib/SuiteEnvInfo");
var path = require("path");
var unitTestSrcDir = '../../../../test/unit';
var UnitUtil = /** @class */ (function () {
    function UnitUtil() {
    }
    UnitUtil.getBusybeeParsedConfig = function () {
        var confPath = path.join(__dirname, unitTestSrcDir, 'util');
        var configParser = new ConfigParser_1.ConfigParser({ directory: confPath });
        return configParser.parse('test');
    };
    UnitUtil.getRESTSuiteManager = function (config) {
        var parsedTs = config.parsedTestSuites.values()[0];
        var suiteEnvId = parsedTs.testEnvs.values()[0].suiteEnvID;
        var envInfo = new SuiteEnvInfo_1.SuiteEnvInfo(parsedTs, suiteEnvId, 100, 'localhost');
        return new RESTSuiteManager_1.RESTSuiteManager(config, envInfo);
    };
    return UnitUtil;
}());
exports.UnitUtil = UnitUtil;
//# sourceMappingURL=UnitUtil.js.map