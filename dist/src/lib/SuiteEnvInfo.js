"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var SuiteEnvInfo = /** @class */ (function () {
    function SuiteEnvInfo(suiteConf, suiteEnvID, resourceCost, hostName) {
        this.suiteID = suiteConf.suiteID;
        this.suiteEnvID = suiteEnvID;
        this.resourceCost = resourceCost;
        this.hostName = hostName;
        this.startScript = suiteConf.env.startScript;
        this.stopScript = suiteConf.env.stopScript;
        this.runScript = suiteConf.env.runScript;
        this.healthcheck = suiteConf.env.healthcheck;
        this.protocol = suiteConf.protocol;
        this.defaultRequestOpts = suiteConf.defaultRequestOpts;
        this.root = suiteConf.root;
        this.testSets = suiteConf.testEnvs.get(suiteEnvID).testSets;
        this.startData = suiteConf.testEnvs.get(suiteEnvID).startData;
        this.stopData = suiteConf.testEnvs.get(suiteEnvID).stopData;
    }
    SuiteEnvInfo.prototype.setStartScriptReturnData = function (data) {
        this.startScriptReturnData = data;
    };
    SuiteEnvInfo.prototype.getStartScriptReturnData = function () {
        return this.startScriptReturnData;
    };
    SuiteEnvInfo.prototype.setStartScriptErrorData = function (data) {
        this.startScriptErrorData = data;
    };
    SuiteEnvInfo.prototype.getStartScriptErrorData = function () {
        return this.startScriptErrorData;
    };
    return SuiteEnvInfo;
}());
exports.SuiteEnvInfo = SuiteEnvInfo;
//# sourceMappingURL=SuiteEnvInfo.js.map