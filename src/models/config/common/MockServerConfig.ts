import {ProxyConfig} from "../user/ProxyConfig";
import {RequestOptsConfig} from "./RequestOptsConfig";

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
export class MockServerConfig {
  /**
   * Port to run the mock server on. defaults to the port defined in the TestSuite being mocked
   */
  port: number;
  /**
   *  A root context that should be prepended to paths defined in a TestSuite and/or Test
   */
  root: string;
  /**
   * The location of a service to forward calls to in the event that a mock is not found for an incoming request
   */
  proxy: ProxyConfig;
  /**
   * @hidden
   */
  cors: boolean;
  /**
   * Allows UI developers to mimic an intermediate service which may decorate the request with additional headers, params, body, etc.
   * Opts specified in this section will be merged into the request once it arrives at the Mock Server but before attempting to match a mocked test.
   */
  injectedRequestOpts: RequestOptsConfig;

  constructor() {
    this.port = void 0;
    this.root = void 0;
    this.proxy = void 0;
    this.injectedRequestOpts = void 0;
    this.cors = void 0;
  }
}
