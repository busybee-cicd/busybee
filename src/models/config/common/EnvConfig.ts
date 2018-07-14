import {HealthCheckConfig} from "../user/HealthCheckConfig";

/**
 * ```
 * {
 *   parallel: true,
 *   resourceCost: 100,
 *   startScript: 'start.sh',
 *   stopScript: 'stop.sh',
 *   runScript: 'run.sh',
 *   healthCheck: HealthCheckConfig
 * }
 * ```
 */
export class EnvConfig {
  /**
   * **Default** `false`
   * Dictates whether or not this Test Suite is allowed to run multiple instances on a single resource simultaneously
   */
  parallel: boolean;
  /**
   * **Default** `100` <br>
   * **Allowed** A number between `0` and `100` <br>
   * A measurement of how many 'resource units' 1 instance of this env will consume while running. See HostConfig.capacity
   */
  resourceCost: number;
  /**
   * <span style="color:red">**Required**</span> <br>
   * **Example** `scripts/startScript.sh` <br>
   * A shell script expected to start your environment. The value can be relative to the busybee directory or absolute
   * Receives the following arguments `generatedEnvID` `hostName` `port` `testDirectoryPath` <br>
   */
  startScript: string;
  /**
   * <span style="color:red">**Required**</span> <br>
   * **Example** `scripts/stopScript.sh` <br>
   * A shell script expected to stop your environment. The value can be relative to the busybee directory or absolute.
   * Receives the following arguments `generatedEnvID` `hostName` `port` `testDirectoryPath`
   */
  stopScript: string;
  /**
   * <span style="color:magenta">Required if `TestSuiteConfig.type` == 'USER_PROVIDED'</span> <br>
   * **Example** `scripts/stopScript.sh` <br>
   * A shell script expected to stop your environment. The value can be relative to the busybee directory or absolute.
   * Receives the following arguments `generatedEnvID` `hostName` `port` `testDirectoryPath`
   */
  runScript: string;
  healthcheck: HealthCheckConfig;

  constructor() {
    this.parallel = void 0;
    this.resourceCost = void 0;
    this.startScript = void 0;
    this.stopScript = void 0;
    this.runScript = void 0;
    this.healthcheck = void 0;
  }
}
