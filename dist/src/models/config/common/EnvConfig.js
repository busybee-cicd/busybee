"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * {<br>
 *   parallel: true,<br>
 *   resourceCost: 100,<br>
 *   startScript: 'start.sh',<br>
 *   stopScript: 'stop.sh',<br>
 *   runScript: 'run.sh',<br>
 *   healthCheck: HealthCheckConfig<br>
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