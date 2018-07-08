"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Defines how an instance of a TestSuite environment should be provisioned
 *
 * {<br>
 * &nbsp; id: 'read-only env',<br>
 * &nbsp; testSets: TestSetConfig[],<br>
 * &nbsp; startData: {<br>
 * &nbsp; &nbsp; retries: 5<br>
 * &nbsp; },<br>
 * &nbsp; stopData: {<br>
 * &nbsp; &nbsp; signal: 'SIGTERM,<br>
 * &nbsp; }<br>
 * }
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