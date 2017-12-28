import {deserialize} from 'json-typescript-mapper';
import {BusybeeUserConfig} from "../models/config/BusybeeUserConfig";
import {BusybeeParsedConfig} from "../models/config/BusybeeParsedConfig";
import {FilePathsConfig} from "../models/config/parsed/FilePathsConfig";

export class ConfigParser {

  private cmdOpts: any;
  private logLevel: string;
  private parsedConfig: BusybeeParsedConfig;
  private filePaths: FilePathsConfig;

  constructor(cmdOpts) {
    this.filePaths = new FilePathsConfig(cmdOpts);
    this.cmdOpts = cmdOpts;
  }

  parse(mode): BusybeeParsedConfig {
    let userConfig = deserialize(BusybeeUserConfig, require(this.filePaths.userConfigFile));
    this.parsedConfig = new BusybeeParsedConfig(userConfig, this.cmdOpts, mode);
    return this.parsedConfig;
  }

}
