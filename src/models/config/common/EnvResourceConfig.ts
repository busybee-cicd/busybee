import {HostConfig} from "../user/HostConfig";

/**
 * Configuration opts for provisioning Test Set Environments
 *
 * {<br>
 * &nbsp; hosts: HostConfig[]<br>
 * }
 */
export class EnvResourceConfig {
  /**
   * <span style="color:red">**Required**</span> <br>
   */
  hosts: HostConfig[];

  constructor() {
    this.hosts = void 0;
  }
}
