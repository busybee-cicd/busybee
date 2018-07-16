"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Provide a configuration for running your REST TestSuite in 'mock' mode
 * ```
 * {
 *   port: 8180,
 *   root: '/my-service-context',
 *   proxy: ProxyConfig,
 *   injectedRequestOpts: RequestOptsConfig
 * }
 * ```
 */
var MockServerConfig = /** @class */ (function () {
    function MockServerConfig() {
        this.port = void 0;
        this.root = void 0;
        this.proxy = void 0;
        this.injectedRequestOpts = void 0;
        this.cors = void 0;
    }
    return MockServerConfig;
}());
exports.MockServerConfig = MockServerConfig;
//# sourceMappingURL=MockServerConfig.js.map