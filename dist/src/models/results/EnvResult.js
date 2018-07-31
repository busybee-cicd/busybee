"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var EnvResult = /** @class */ (function () {
    function EnvResult() {
    }
    EnvResult.new = function (type, suiteID, suiteEnvID) {
        var res = new this();
        res.type = 'REST';
        res.suiteID = suiteID;
        res.env = suiteEnvID;
        return res;
    };
    return EnvResult;
}());
exports.EnvResult = EnvResult;
//# sourceMappingURL=EnvResult.js.map