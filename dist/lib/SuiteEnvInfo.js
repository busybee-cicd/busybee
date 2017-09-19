"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var SuiteEnvInfo = /** @class */ (function () {
    function SuiteEnvInfo(suiteConf, suiteID, suiteEnvID, resourceCost, hostName) {
        this.startScript = suiteConf.env.startScript;
        this.stopScript = suiteConf.env.stopScript;
        this.runScript = suiteConf.env.runScript;
        this.healthcheck = suiteConf.env.healthcheck;
        this.protocol = suiteConf.protocol;
        this.defaultRequestOpts = suiteConf.defaultRequestOpts;
        this.root = suiteConf.root;
        this.suiteID = suiteID;
        this.suiteEnvID = suiteEnvID;
        this.resourceCost = resourceCost;
        this.hostName = hostName;
    }
    return SuiteEnvInfo;
}());
exports.SuiteEnvInfo = SuiteEnvInfo;
//# sourceMappingURL=SuiteEnvInfo.js.map