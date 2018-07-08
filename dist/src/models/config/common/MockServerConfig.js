"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Provide a configuration for running your REST TestSuite in 'mock' mode
 *
 * {<br>
 * &nbsp port: 8180,<br>
 * &nbsp root: '/my-service-context',<br>
 * &nbsp proxy: ProxyConfig,<br>
 * &nbsp injectedRequestOpts: RequestOptsConfig<br>
 * }
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