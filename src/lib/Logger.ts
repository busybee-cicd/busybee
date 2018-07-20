import * as _ from 'lodash';

export class Logger {

  public static readonly TRACE = 'TRACE';
  public static readonly DEBUG = 'DEBUG';
  public static readonly INFO = 'INFO';
  public static readonly WARN = 'WARN';
  public static readonly ERROR = 'ERROR';
  private static readonly validLevels = [Logger.TRACE, Logger.DEBUG, Logger.INFO, Logger.WARN, Logger.ERROR];
  private conf: any;
  private className: string;
  private logLevel: string;
  private levelMap: any;
  private writeCb: (msg:string)=>void;

  constructor(conf: any, clazz, writeCb: (msg:string)=>void = null) {
    this.conf = _.cloneDeep(conf);
    this.className = clazz.constructor.name;
    this.logLevel = conf.logLevel || Logger.INFO;
    this.logLevel = this.logLevel.toUpperCase();
    this.levelMap = {
      'TRACE': 0,
      'DEBUG': 1,
      'INFO': 2,
      'WARN': 3,
      'ERROR': 4
    };
    this.writeCb = writeCb || console.log;
  }

  static isLogLevel(val) {
    return Logger.validLevels.indexOf(val.toUpperCase()) !== -1 ? true : false;
  }

  passesLevel(level) {
    return this.levelMap[level] >= this.levelMap[this.logLevel];
  }

  debug(message, pretty = false) {
    this.write(Logger.DEBUG, message, pretty);
  }

  info(message, pretty = false) {
    this.write(Logger.INFO, message, pretty);
  }

  warn(message, pretty = false) {
    this.write(Logger.WARN, message, pretty);
  }

  error(message, pretty = false) {
    this.write(Logger.ERROR, message, pretty);
  }

  trace(message, pretty = false) {
    this.write(Logger.TRACE, message, pretty);
  }

  private write(level, message, pretty) {
    if (!this.passesLevel(level)) {
      return;
    }

    if (_.isObject(message)) {
      if (pretty) {
        message = JSON.stringify(message, null, '\t');
      } else {
        message = JSON.stringify(message);
      }
      if (this.logLevel === Logger.DEBUG || this.logLevel === Logger.TRACE) {
        level = `${level}:${this.className}:`;
      }
      this.writeCb(level);
      this.writeCb(message);
    } else {
      if (this.logLevel === Logger.DEBUG || this.logLevel === Logger.TRACE) {
        this.writeCb(`${level}:${this.className}: ${message}`);
      } else {
        this.writeCb(`${level}: ${message}`);
      }
    }

  }
}
