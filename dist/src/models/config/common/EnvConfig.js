"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ```
 * {
 *   parallel: true,
 *   resourceCost: 100,
 *   startScript: 'start.sh',
 *   stopScript: 'stop.sh',
 *   runScript: 'run.sh',
 *   healthCheck: HealthCheckConfig
 * }
 * ```
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