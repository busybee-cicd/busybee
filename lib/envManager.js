const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const uuidv1 = require('uuid/v1');
const path = require('path');
const _async = require('async');

class EnvManager {
  constructor(conf) {
    this.conf = conf;
    this.currentEnvIds = [];
  }

  async stop(envId) {
    if (this.conf.cmdOpts.skipEnvProvisioning) {
      return Promise.resolve();
    }

    console.log(`Stopping Environment: ${envId}`);
    return execFile(path.join(this.conf.filePaths.testDir, this.conf.envStopScript), [envId]);
  }

  async stopAll(cb) {
    if (this.conf.cmdOpts.skipEnvProvisioning) {
      return Promise.resolve();
    }

    let stopFns = this.currentEnvIds.map((envId) => {
      return (cb2) => {
        this.stop(envId).then(() => { cb2(null); });
      }
    });

    return new Promise((resolve, reject) => {
      _async.parallel(stopFns, (err, results) => {
        this.currentEnvIds = [];
        resolve();
      });
    })
  }

  async start(port, envId) {
    if (this.conf.cmdOpts.skipEnvProvisioning) {
      return Promise.resolve();
    }

    console.log(`Starting Environment: ${envId}`);
    let conf = this.conf;
    this.currentEnvIds.push(envId);
    let args = [envId, conf.apiHost, port, conf.filePaths.testDir];
    const { stdout, stderr } = await execFile(path.join(conf.filePaths.testDir, conf.envStartScript), args);

    return new Promise((resolve, reject) => {
      if (stdout.includes("ready")) {
        resolve();
      } else {
        reject();
      }
    });
  }

  generateId() {
    return uuidv1();
  }

}

module.exports = EnvManager;
