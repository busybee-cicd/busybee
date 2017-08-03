const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const uuidv1 = require('uuid/v1');
const path = require('path');
const _async = require('async');
const Logger = require('./logger');

class EnvManager {
  constructor(conf, restManager) {
    this.conf = conf;
    this.logger = new Logger(conf);
    this.restManager = restManager;
    this.currentEnvIds = [];
  }

  async stop(envId) {
    if (this.conf.cmdOpts.skipEnvProvisioning) {
      return Promise.resolve();
    }

    console.log(`Stopping Environment: ${envId}`);
    this.currentEnvIds.remove(envId);
    this.logger.debug(this.currentEnvIds);
    return execFile(path.join(this.conf.filePaths.feenyDir, this.conf.env.stopScript), [envId]);
  }

  async stopAll(cb) {
    if (this.conf.cmdOpts.skipEnvProvisioning) {
      return Promise.resolve();
    }

    let stopFns = this.currentEnvIds.map((envId) => {
      return (cb2) => {
        this.stop(envId)
          .then(() => { cb2(null); })
          .catch((err) => { cb2(err); });
      }
    });

    return new Promise((resolve, reject) => {
      _async.parallel(stopFns, (err, results) => {
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
      this.logger.debug(this.currentEnvIds);
      let args = [envId, conf.restApi.host, port, conf.filePaths.feenyDir];
      try {
        const { stdout, stderr } = await execFile(path.join(conf.filePaths.feenyDir, conf.env.startScript), args);

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
    this.logger.debug(`confirmHealthcheck ${port} ${envId}`);

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

Array.prototype.remove= function(){
    var what, a= arguments, L= a.length, ax;
    while(L && this.length){
        what= a[--L];
        while((ax= this.indexOf(what))!= -1){
            this.splice(ax, 1);
        }
    }
    return this;
}

module.exports = EnvManager;
