class Logger {
  constructor(conf) {
    this.conf = conf;
  }

  debug(message) {
    if (this.conf.debug) {
      this.write('DEBUG', message);
    }
  }

  info(message) {
    this.write('INFO', message);
  }

  warn(message) {
    this.write('WARN', message);
  }

  error(message) {
    this.write('ERROR', message);
  }

  write(level, message) {
    console.log(`${level}: ${message}`);
  }
}

module.exports = Logger;
