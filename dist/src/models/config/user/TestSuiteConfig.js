"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ```
 * {
 *   id: 'API test suite',
 *   type: 'REST',
 *   skip: false,
 *   env: EnvConfig,
 *   envInstances: EnvInstanceConfig[],
 *   protocol: 'http',
 *   ports: [8080],
 *   root: '/v1'
 *   testFolder: 'api-tests',
 *   defaultRequestOpts: RequestOptsConfig,
 *   mockServer: MockServerConfig
 * }
 * ```
 */
var TestSuiteConfig = /** @class */ (function () {
    function TestSuiteConfig() {
        this.id = void 0;
        this.type = void 0;
        this.skip = void 0;
        this.protocol = void 0;
        this.host = void 0;
        this.ports = void 0;
        this.defaultRequestOpts = void 0;
        this.env = void 0;
        this.envInstances = void 0;
        this.mockServer = void 0;
        this.root = void 0;
        this.testFolder = void 0;
    }
    return TestSuiteConfig;
}());
exports.TestSuiteConfig = TestSuiteConfig;
//# sourceMappingURL=TestSuiteConfig.js.map