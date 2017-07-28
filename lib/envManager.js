const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const uuidv1 = require('uuid/v1');
const path = require('path');
const _async = require('async');

class EnvManager {
  constructor(conf, restManager) {
    this.conf = conf;
    this.restManager = restManager;
    this.currentEnvIds = [];
  }

  async stop(envId) {
    if (this.conf.cmdOpts.skipEnvProvisioning) {
      return Promise.resolve();
    }

    console.log(`Stopping Environment: ${envId}`);
    return execFile(path.join(this.conf.filePaths.testDir, this.conf.env.stopScript), [envId]);
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
    return new Promise(async (resolve, reject) => {
      if (this.conf.cmdOpts.skipEnvProvisioning) {
        resolve();
      }

      console.log(`Starting Environment: ${envId}`);
      let conf = this.conf;
      this.currentEnvIds.push(envId);
      let args = [envId, conf.restApi.host, port, conf.filePaths.testDir];
      try {
        const { stdout, stderr } = await execFile(path.join(conf.filePaths.testDir, conf.env.startScript), args);

        if (stdout.includes("ready")) {
          resolve();
        } else {
          reject();
        }
      } catch (err) {
        reject();
      }
    });
  }

  generateId() {
    return uuidv1();
  }

  /*
    TODO: support multiple healthcheck types
  */
  confirmHealthcheck(port, envId) {
    if (this.conf.debug) {
      console.log(`confirmHealthcheck ${port} ${envId}`);
    }

    return new Promise((resolve, reject) => {
      let envConf = this.conf.env;
      if (!envConf.healthcheck) {
        console.log("No Healthcheck provided. Moving on.");
        resolve();
      }

      if (!envConf.healthcheck.type) {
        console.log("Healthcheck 'type' not provided. Skipping Healthcheck");
        resolve();
      }

      if (envConf.healthcheck.type.toUpperCase() === "REST") {
        let requestConf = envConf.healthcheck.request;
        let opts = this.restManager.buildRequest(requestConf, port);

        // retries the healthcheck endpoint every 3 seconds up to 20 times
        // when successful calls the cb passed to confirmHealthcheck()
        _async.retry({times: 20, interval: 5000},
          (asyncCb) => {
            console.log(`Attempting healthcheck for stack-${envId}...`);
            this.restManager.apiRequest(opts, (err, res, body) => {
              if (err) {
                asyncCb("failed");
                return
              }

              if (res && res.statusCode === 200) {
                console.log("Healthcheck Confirmed!");
                asyncCb(null, true);
              } else {
                asyncCb("failed");
              }
            })
          }
          , (err, results) => {
            if (err) {
              reject(err);
            } else {
              resolve(results);
            }
          });
      } else {
        console.log("Healthcheck 'type' not recognized. Skipping Healthcheck");
        resolve();
      }

    });
  }

}

module.exports = EnvManager;
