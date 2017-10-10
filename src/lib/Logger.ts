import * as _ from 'lodash';
import {BusybeeParsedConfig} from "../config/BusybeeParsedConfig";

export class Logger {

  private static readonly validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
  private conf: any;
  private className: string;
  private logLevel: string;
  private levelMap: any;

  constructor(conf: any, clazz) {
    this.conf = conf;
    this.className = clazz.constructor.name;
    this.logLevel = conf.logLevel || 'INFO';
    this.logLevel = this.logLevel.toUpperCase();
    this.levelMap = {
      'DEBUG': 0,
      'INFO': 1,
      'WARN': 2,
      'ERROR': 3
    }
  }

  static isLogLevel(val) {
    return Logger.validLevels.indexOf(val.toUpperCase()) !== -1 ? true : false;
  }

  passesLevel(level) {
    return this.levelMap[level] >= this.levelMap[this.logLevel];
  }


  debug(message, pretty = false) {
    this.write('DEBUG', message, pretty);
  }

  info(message, pretty = false) {
    this.write('INFO', message, pretty);
  }

  warn(message, pretty = false) {
    this.write('WARN', message, pretty);
  }

  error(message, pretty = false) {
    this.write('ERROR', message, pretty);
  }

  write(level, message, pretty) {
    if (!this.passesLevel(level)) { return; }

    if (_.isObject(message)) {
      if (pretty) {
        message = JSON.stringify(message, null, '\t');
      } else {
        message = JSON.stringify(message);
      }
      if (this.logLevel === 'DEBUG') {
        level = `${level}:${this.className}:`;
      }
      console.log(level);
      console.log(message);
    } else {
      if (this.logLevel === 'DEBUG') {
        console.log(`${level}:${this.className}: ${message}`);
      } else {
        console.log(`${level}: ${message}`);
      }
    }

  }
}
