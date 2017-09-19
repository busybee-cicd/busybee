import {RequestOptsConfig} from "../common/RequestOptsConfig";
import {EnvConfig} from "../common/EnvConfig";
import {EnvInstanceConfig} from "./EnvInstanceConfig";
import {MockServerConfig} from "../common/MockServerConfig";
export class TestSuiteConfig {
  id: string;
  type: string;
  skip: boolean;
  protocol: string;
  host: string;
  root: string;
  ports: number[];
  defaultRequestOpts: RequestOptsConfig;
  env: EnvConfig;
  envInstances: EnvInstanceConfig[];
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
  }
}
