import {TestSuiteConfig} from "./user/TestSuiteConfig";
import {EnvResourceConfig} from "./common/EnvResourceConfig";
import {JsonProperty} from "json-typescript-mapper";

export class BusybeeUserConfig {
  envResources: EnvResourceConfig[];
  onComplete: string;
  testSuites: TestSuiteConfig[];

  constructor() {
    this.envResources = void 0;
    this.onComplete = void 0;
    this.testSuites = void 0;
  }
}
