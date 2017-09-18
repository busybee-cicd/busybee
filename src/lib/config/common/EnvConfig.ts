import {HealthCheckConfig} from "../user/HealthCheckConfig";
export class EnvConfig {
  parallel: boolean;
  resourceCost: number;
  startScript: string;
  stopScript: string;
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
