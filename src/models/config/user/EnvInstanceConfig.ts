import {TestSetConfig} from "./TestSetConfig";
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
export class EnvInstanceConfig {
  /**
   * <span style="color:red">**Required**</span> <br>
   * **Example** `read-only environment`
   * a unique id used to identify this TestEnv
   */
  id: string
  /**
   * <span style="color:red">**Required**</span> <br>
   * List of test sets that should run with-in this environment instance.
   * A TestEnv can only have tests added to it via a TestSet and therefore requires at least one TestSet.
   */
  testSets: TestSetConfig[];
  /**
   * Data that will be passed to the startScript as `startData` when this environment instance is started
   */
  startData: any;
  /**
   * Data that will be passed to the stopScript as `stopData` when this environment instance is stopped
   */
  stopData: any;

  constructor() {
    this.id = void 0;
    this.testSets = void 0;
    this.startData = void 0;
    this.stopData = void 0;
  }
}
