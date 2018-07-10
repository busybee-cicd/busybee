"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * {<br>
 * &nbsp parallel: true,<br>
 * &nbsp resourceCost: 100,<br>
 * &nbsp startScript: 'start.sh',<br>
 * &nbsp stopScript: 'stop.sh',<br>
 * &nbsp runScript: 'run.sh',<br>
 * &nbsp healthCheck: HealthCheckConfig<br>
 * }
 */
var EnvConfig = /** @class */ (function () {
    function EnvConfig() {
        this.parallel = void 0;
        this.resourceCost = void 0;
        this.startScript = void 0;
        this.stopScript = void 0;
        this.runScript = void 0;
        this.healthcheck = void 0;
    }
    return EnvConfig;
}());
exports.EnvConfig = EnvConfig;
//# sourceMappingURL=EnvConfig.js.map