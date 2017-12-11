import * as fs from 'fs';
import {Logger} from './Logger';
import {deserialize} from 'json-typescript-mapper';
import {BusybeeUserConfig} from "../models/config/BusybeeUserConfig";
import {BusybeeParsedConfig} from "../models/config/BusybeeParsedConfig";
import {FilePathsConfig} from "../models/config/parsed/FilePathsConfig";

export class ConfigParser {

  private cmdOpts: any;
  private logLevel: string;
  private logger: Logger;
  private parsedConfig: BusybeeParsedConfig;
  private filePaths: FilePathsConfig;

  constructor(cmdOpts) {
    this.filePaths = new FilePathsConfig(cmdOpts);
    this.cmdOpts = cmdOpts;
    this.logLevel = this.getLogLevel(cmdOpts);
    this.logger = new Logger({logLevel: this.logLevel}, this);
  }

  getLogLevel(cmdOpts) {
    let logLevel;
    if (process.env.BUSYBEE_DEBUG) {
      logLevel = 'DEBUG';
    } else if (process.env.BUSYBEE_LOG_LEVEL) {
      if (Logger.isLogLevel(process.env.BUSYBEE_LOG_LEVEL)) {
        logLevel = process.env.BUSYBEE_LOG_LEVEL;
      }
    } else if (cmdOpts) {
      if (this.cmdOpts.debug) {
        logLevel = 'DEBUG';
      } else if (cmdOpts.logLevel) {
        if (Logger.isLogLevel(cmdOpts.logLevel)) {
          logLevel = cmdOpts.logLevel;
        }
      }
    }

    process.env.BUSYBEE_LOG_LEVEL = logLevel;
    return logLevel;
  }

  parse(mode): BusybeeParsedConfig {
    let userConfig = deserialize(BusybeeUserConfig, require(this.filePaths.userConfigFile));
    this.parsedConfig = new BusybeeParsedConfig(userConfig, this.cmdOpts, mode);
    return this.parsedConfig;
  }

}
