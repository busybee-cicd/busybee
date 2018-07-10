"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 * {<br>
 * &nbsp; id: 'API test suite',<br>
 * &nbsp; type: 'REST',<br>
 * &nbsp; skip: false,<br>
 * &nbsp; env: EnvConfig,<br>
 * &nbsp; envInstances: EnvInstanceConfig[],<br>
 * &nbsp; protocol: 'http',<br>
 * &nbsp; ports: [8080],<br>
 * &nbsp; root: '/v1'<br>
 * &nbsp; testFolder: 'api-tests',<br>
 * &nbsp; defaultRequestOpts: RequestOptsConfig,<br>
 * &nbsp; mockServer: MockServerConfig<br>
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