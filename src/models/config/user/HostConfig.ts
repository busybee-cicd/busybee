/**
 * Properties of an available host that test environments can be deployed to
 * ```
 * {
 *   name: 'localhost',
 *   capacity: 200
 * }
 * ```
 */
export class HostConfig {
  /**
   * **Example** `localhost`
   * hostname of an available resource
   */
  name: string;
  /**
   * **Default* `100` <br>
   * **Allowed** A number between `0` and `100` <br>
   * A crude measurement of the total resources available at this host.
   * Supplied with a value of `100`, a TestSuite.env with a resourceCost of 50 would be able to run 2 instances on this host simultaneously.
   * When an instance of a Test Suite is added to a host its resourceCost is added to the load of that host.
   * If an instance's (resourceCost + host.currentLoad) > capacity then the instance will wait until instances are removed from the host.
   */
  capacity: string;

  constructor() {
    this.name = void 0;
    this.capacity = void 0;
  }
}
