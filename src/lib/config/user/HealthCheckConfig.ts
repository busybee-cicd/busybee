import {RequestOptsConfig} from "../common/RequestOptsConfig";

export class HealthCheckConfig {
  type: string;
  retries: number;
  request: RequestOptsConfig;

  constructor() {
    this.type = void 0;
    this.retries = void 0;
    this.request = void 0;
  }
}
