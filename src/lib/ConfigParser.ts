import * as fs from 'fs';
import {Logger} from './Logger';
import {deserialize} from 'json-typescript-mapper';
import {BusybeeUserConfig} from "../config/BusybeeUserConfig";
import {BusybeeParsedConfig} from "../config/BusybeeParsedConfig";
import {FilePathsConfig} from "../config/parsed/FilePathsConfig";

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
    let userConfig = deserialize(BusybeeUserConfig, JSON.parse(fs.readFileSync(this.filePaths.userConfigFile, 'utf8')));
    this.parsedConfig = new BusybeeParsedConfig(userConfig, this.cmdOpts, mode);
    return this.parsedConfig;
  }

}
