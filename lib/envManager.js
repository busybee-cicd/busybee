const { execFile } = require('child_process');
const uuidv1 = require('uuid/v1');
const path = require('path');
const async = require('async');

class EnvManager {
  constructor(conf) {
    this.conf = conf;
    this.currentEnvIds = [];
  }

  stop(envId) {
    console.log(`Stopping Environment: ${envId}`);
    return execFile(path.join(this.conf.filePaths.testDir, this.conf.envStopScript), [envId]);
  }

  stopAll(cb) {
    let stopFns = this.currentEnvIds.map((envId) => {
      return (cb2) => {
        let proc = this.stop(envId);
        proc.on('data', () => {
          cb2(null);
        });
      }
    });

    async.parallel(stopFns, (err, results) => {
      this.currentEnvIds = [];
      cb();
    });
  }

  start(port, envId) {
    console.log(`Starting Environment: ${envId}`);
    let conf = this.conf;
    this.currentEnvIds.push(envId);
    let args = [envId, conf.apiHost, port, conf.filePaths.testDir];
    return execFile(path.join(conf.filePaths.testDir, conf.envStartScript), args);
  }

  generateId() {
    return uuidv1();
  }

}

module.exports = EnvManager;
