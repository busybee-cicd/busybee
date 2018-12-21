/*
Models a specific instance of an Environment of a TestSuite.
*/
import { ParsedTestSuite } from '../models/config/parsed/ParsedTestSuiteConfig';
import { ParsedTestSetConfig } from '../models/config/parsed/ParsedTestSetConfig';
import { RequestOptsConfig } from '../models/config/common/RequestOptsConfig';
import { TypedMap } from './TypedMap';
export class SuiteEnvInfo {
  startScript: string;
  private startScriptReturnData: string;
  private startScriptErrorData: string;
  stopScript: string;
  runScript: string;
  healthcheck: any;
  protocol: string;
  defaultRequestOpts: RequestOptsConfig;
  root: string;
  suiteID: string;
  suiteEnvID: string;
  resourceCost: number;
  hostName: string;
  testSets: TypedMap<ParsedTestSetConfig>;
  ports: number[];
  startData: any;
  stopData: any;

  constructor(
    suiteConf: ParsedTestSuite,
    suiteEnvID: string,
    resourceCost: number,
    hostName: string
  ) {
    this.suiteID = suiteConf.suiteID;
    this.suiteEnvID = suiteEnvID;
    this.resourceCost = resourceCost;
    this.hostName = hostName;
    this.startScript = suiteConf.env.startScript;
    this.stopScript = suiteConf.env.stopScript;
    this.runScript = suiteConf.env.runScript;
    this.healthcheck = suiteConf.env.healthcheck;
    this.protocol = suiteConf.protocol;
    this.defaultRequestOpts = suiteConf.defaultRequestOpts;
    this.root = suiteConf.root;
    this.testSets = suiteConf.testEnvs.get(suiteEnvID).testSets;
    this.startData = suiteConf.testEnvs.get(suiteEnvID).startData;
    this.stopData = suiteConf.testEnvs.get(suiteEnvID).stopData;
  }

  setStartScriptReturnData(data: string) {
    this.startScriptReturnData = data;
  }

  getStartScriptReturnData(): string {
    return this.startScriptReturnData;
  }

  setStartScriptErrorData(data: string) {
    this.startScriptErrorData = data;
  }

  getStartScriptErrorData(): string {
    return this.startScriptErrorData;
  }
}
