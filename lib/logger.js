class Logger {
  constructor(conf) {
    this.conf = conf;
  }

  debug(message) {
    if (this.conf.debug) {
      this.write('DEBUG', message);
    }
  }

  log(message) {
    this.write('LOG', message);
  }

  write(level, message) {
    console.log(`${level}: ${message}`);
  }
}

module.exports = Logger;
