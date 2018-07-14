import {RequestOptsConfig} from "../common/RequestOptsConfig";
import {EnvConfig} from "../common/EnvConfig";
import {EnvInstanceConfig} from "./EnvInstanceConfig";
import {MockServerConfig} from "../common/MockServerConfig";

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
export class TestSuiteConfig {
  /**
   * <span style="color:red">**Required**</span> <br>
   * A unique id for this Test Suite <br>
   * **Example** `user test suite`
   */
  id: string;
  /**
   * <span style="color:red">**Required**</span> <br>
   * **Defaut** `REST` <br>
   * **Allowed** `REST` `USER_PROVIDED` <br>
   * Dictates how the Test Suite is parsed. Busybee has it's own REST api testing implementation. For all other test suites choose 'USER_PROVIDED'
   */
  type: string;
  /**
   * <span style="color:red">**Required**</span> <br>
   * Whether or not to skip this Test Suite
   */
  skip: boolean;
  /**
   * Provides properties for describing how to provision an environment for this TestSuite
   */
  env: EnvConfig;
  /**
   * Configuration for creating instances of this TestSuite's Environment. Allows the user to provide
   * env-specific parameters to modify how TestSet(s) are run.
   */
  envInstances: EnvInstanceConfig[];
  /**
   * *<span style="color:magenta">**Required** if `TestSuiteConfig.type` == `REST`</span>* <br>
   * **Allowed** `http` `https`
   */
  protocol: string;
  /**
   * *<span style="color:magenta">**Required** if `--skipEnvProvisioning` is enabled</span>* <br>
   * **Example** `myhost` <br>
   * Provide a host when you plan to run tests against an already running environment.
   */
  host: string;
  /**
   * *<span style="color:magenta">**Required** if `TestSuiteConfig.type` == `REST`</span>* <br>
   * Ports required by this suite. By default the first port supplied will be used for your
   * healthcheck port if not specific in the HealthCheck
   */
  ports: number[];
  /**
   * *<span style="color:magenta">Available if `TestSuiteConfig.type` == `REST`</span>* <br>
   * **Example** `/v1` <br>
   * root context of all api calls
   */
  root: string;
  /**
   * *<span style="color:magenta">Available if `TestSuiteConfig.type` == `REST`</span>* <br>
   * **Example** `apiTests/` <br>
   * The directory containing your REST .js/.json test definitions.
   */
  testFolder: string;
  /**
   * *<span style="color:magenta">Available if `TestSuiteConfig.type` == `REST`</span>* <br>
   * Request params to be sent by default on each api request. defaultRequestOpts can be overridden with-in individual tests.
   */
  defaultRequestOpts: RequestOptsConfig;
  /**
   * *<span style="color:magenta">Available if `TestSuiteConfig.type` == `REST`</span>* <br>
   * Provide a configuration for running your REST TestSuite in 'mock' mode
   */
  mockServer: MockServerConfig;

  constructor() {
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
}
