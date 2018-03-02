import {deserialize} from 'json-typescript-mapper';
import {BusybeeUserConfig} from "../models/config/BusybeeUserConfig";
import {BusybeeParsedConfig} from "../models/config/BusybeeParsedConfig";
import {FilePathsConfig} from "../models/config/parsed/FilePathsConfig";
import * as _ from 'lodash';

export class ConfigParser {

  private cmdOpts: any;
  private logLevel: string;
  private filePaths: FilePathsConfig;

  constructor(cmdOpts) {
    this.filePaths = new FilePathsConfig(cmdOpts);
    this.cmdOpts = Object.assign({}, cmdOpts);
  }

  parse(mode): BusybeeParsedConfig {
    let userConfig = deserialize(BusybeeUserConfig, require(this.filePaths.userConfigFile));
    return new BusybeeParsedConfig(userConfig, this.cmdOpts, mode);
  }

}
