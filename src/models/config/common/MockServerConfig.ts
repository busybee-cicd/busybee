import {ProxyConfig} from "../user/ProxyConfig";
import {RequestOptsConfig} from "./RequestOptsConfig";
export class MockServerConfig {
  port: number;
  root: string;
  proxy: ProxyConfig;
  injectRequestOpts: RequestOptsConfig;

  constructor() {
    this.port = void 0;
    this.root = void 0;
    this.proxy = void 0;
    this.injectRequestOpts = void 0;
  }
}
