"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Busybee Configuration. Mapped to Typescript from user-provided config.js/json. The top-level
 * of configuration, the fields in the BusybeeUserConfig are responsible for defining the resources available
 * for environment provisioning, TestSuites that will be run with-in environments and registering reporters for result analysis
 * ```
 * {
 *   envResources: EnvResourceConfig[],
 *   onComplete: 'onComplete.js',
 *   testSuites: TestSuiteConfig[],
 *   reporters: []
 * }
 * ```
 */
var BusybeeUserConfig = /** @class */ (function () {
    function BusybeeUserConfig() {
        this.envResources = void 0;
        this.onComplete = void 0;
        this.testSuites = void 0;
        this.reporters = void 0;
    }
    return BusybeeUserConfig;
}());
exports.BusybeeUserConfig = BusybeeUserConfig;
//# sourceMappingURL=BusybeeUserConfig.js.map