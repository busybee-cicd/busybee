"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Defines how an instance of a TestSuite environment should be provisioned
 * ```
 * {
 *   id: 'read-only env',
 *   testSets: TestSetConfig[],
 *   startData: {
 *     retries: 5
 *   },
 *   stopData: {
 *     signal: 'SIGTERM,
 *   }
 * }
 * ```
 */
var EnvInstanceConfig = /** @class */ (function () {
    function EnvInstanceConfig() {
        this.id = void 0;
        this.testSets = void 0;
        this.startData = void 0;
        this.stopData = void 0;
    }
    return EnvInstanceConfig;
}());
exports.EnvInstanceConfig = EnvInstanceConfig;
//# sourceMappingURL=EnvInstanceConfig.js.map