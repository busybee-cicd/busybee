const _ = require('lodash');

class Logger {
  constructor(conf) {
    this.conf = conf;
  }

  debug(message, pretty) {
    if (this.conf.debug) {
      this.write('DEBUG', message, pretty);
    }
  }

  info(message, pretty) {
    this.write('INFO', message, pretty);
  }

  warn(message, pretty) {
    this.write('WARN', message, pretty);
  }

  error(message, pretty) {
    this.write('ERROR', message, pretty);
  }

  write(level, message, pretty) {
    if (_.isObject(message)) {
      if (pretty) {
        message = JSON.stringify(message, null, '\t');
      } else {
        message = JSON.stringify(message);
      }
      console.log(level);
      console.log(message);
    } else {
      console.log(`${level}: ${message}`);
    }

  }
}

module.exports = Logger;
