/**
 * A TestSet is a logical grouping of tests. One or more TestSets can be assigned to an environment instance.
 * Tests can be run in a specific order with-in a TestSet (see RESTTest.testSet)
 *
 * {<br>
 * &nbsp; id: 'users',<br>
 * &nbsp; controlFlow: 'parallel',<br>
 * &nbsp; runData: {<br>
 * &nbsp; &nbsp; user: 'admin',<br>
 * &nbsp; },<br>
 * &nbsp; description: 'runs all User CRUD tests'<br>
 * }
 */
export class TestSetConfig {
  /**
   * **Example** `users`<br>
   * <span style="color:red">**Required**</span> <br>
   * unique id (name) assigned to the TestSet
   */
  id: string;
  /**
   * **Allowed** `parallel` `series`
   */
  controlFlow: string;
  /**
   * *<span style="color:magenta">**Allowed** if `TestSuiteConfig.type` == `USER_PROVIDED` is enabled</span>* <br>
   * Data that will be passed to the runScript as `runData` when this environment instance is started
   */
  runData: any;
  description: string;

  constructor() {
    this.id = void 0;
    this.controlFlow = void 0;
    this.runData = void 0;
    this.description = void 0;
  }
}
