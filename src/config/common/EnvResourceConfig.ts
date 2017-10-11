import {HostConfig} from "../user/HostConfig";
import {JsonProperty} from "json-typescript-mapper";
export class EnvResourceConfig {
  hosts: HostConfig[];

  constructor() {
    this.hosts = void 0;
  }
}
