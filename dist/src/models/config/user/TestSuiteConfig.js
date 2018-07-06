"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * The top-level of a
 *
 * {<br>
 *   id: 'API test suite',<br>
 *   type: 'REST',<br>
 *   skip: false,<br>
 *   env: EnvConfig,<br>
 *   envInstances: EnvInstanceConfig[],<br>
 *   protocol: 'http',<br>
 *   ports: [8080],<br>
 *   root: '/v1'<br>
 *   testFolder: 'api-tests',<br>
 *   defaultRequestOpts: RequestOptsConfig,<br>
 *   mockServer: MockServerConfig<br>
 * }
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