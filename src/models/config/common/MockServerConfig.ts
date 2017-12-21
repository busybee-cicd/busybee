import {ProxyConfig} from "../user/ProxyConfig";
import {RequestOptsConfig} from "./RequestOptsConfig";
export class MockServerConfig {
  port: number;
  root: string;
  proxy: ProxyConfig;
  cors: boolean;
  injectedRequestOpts: RequestOptsConfig;

  constructor() {
    this.port = void 0;
    this.root = void 0;
    this.proxy = void 0;
    this.injectedRequestOpts = void 0;
    this.cors = void 0;
  }
}
