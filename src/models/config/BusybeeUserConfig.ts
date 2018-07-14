import {TestSuiteConfig} from "./user/TestSuiteConfig";
import {EnvResourceConfig} from "./common/EnvResourceConfig";
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
export class BusybeeUserConfig {
  /**
   * Describes the available resources that environments can be deployed to
   */
  envResources: EnvResourceConfig[];
  /**
   * The name of a .js file to call on completion of all Test Suites.
   * Must export a single function with the signature (errors, results).
   */
  onComplete: string;
  /**
   * <span style="color:red">**Required**</span> <br>
   * A collection of TestSuites to run via `busybee test`
   */
  testSuites: TestSuiteConfig[];
  /**
   * A collection of reporters that will be called at the completion of a TestSuite
   */
  reporters: Array<any>;

  constructor() {
    this.envResources = void 0;
    this.onComplete = void 0;
    this.testSuites = void 0;
    this.reporters = void 0
  }
}
