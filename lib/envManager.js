const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const uuidv1 = require('uuid/v1');
const path = require('path');
const _async = require('async');
const Logger = require('./logger');
const _ = require('lodash');
const RESTManager = require('./restManager');

class EnvManager {
  constructor(conf) {
    this.conf = conf;
    this.logger = new Logger(conf);
    if (conf.cmdOpts.skipEnvProvisioning) {
      this.skipEnvProvisioning = conf.cmdOpts.skipEnvProvisioning.split(',');
    }

    this.buildEnvConfs();
  }

  /*
  envConf
  {
    hosts: ['host1', 'host2'],
    testSuites: {
      'test suite 1': {
        'skip': false,
        'protocol': 'http',
        'port': 8080,
        'env': {
          'parallel': true,
          'resourceCost': 50,
          'startScript': 'api/envStart.sh',
          'stopScript': 'api/envStop.sh',
          'healthcheck': {
            'type': 'REST',
            'retries': 30,
            'request': {
              'endpoint': '/healthcheck',
              'timeout': 5000
            }
          }
        }
      }
    }
  }

  currentHosts
  {
    'host1': {
      'load': 0,
      'envs': {
        '111-111-111-111': {
          port: 8080
        }
      }
     },
    'host2': {
      'capacity': 0,
      'envs': {
        '222-222-222-222': {
          port: 8080
        }
      }
    }
  }

  currentEnvs
  {
    '111-111-111-111': {
      'suiteId': 'test suite 1',
      'hostName': 'host1',
      'resourceCost': 100,
      'startScript': '',
      'stopScript': ''
    },
    '222-222-222-222': {
      'suiteId': 'test suite 1',
      'hostName': 'host2',
      'resourceCost': 100,
      'startScript': '',
      'stopScript': ''
    }
  }
  */
  buildEnvConfs() {
    this.currentEnvs = {};
    //////
    // Environment Resources
    //////
    const conf = Object.assign({}, this.conf);
    if (!conf.envResources.hosts) {
      this.logger.info("No host information provided. Only generatedEnvID info will be passed to scripts");
      return;
    }
    this.currentHosts = {};

    // this.envConf = {};
    // this.envConf.hosts = conf.envResources.hosts;
    //
    //////
    // currentHosts Config
    //////
    this.currentHosts = {};
    conf.envResources.hosts.forEach((hostConfig) => {
      this.currentHosts[hostConfig.name] = {
        load: 0,
        capacity: hostConfig.capacity || 100,
        envs: {}
      }
    });
    //
    // //////
    // // envConf.testSuites
    // //////
    // this.envConf.testSuites = {};
    // conf.testSuites.forEach((suite) => {
    //   this.envConf.testSuites[suite.id] = suite;
    // });
  }

  async stop(generatedEnvID) {
    return new Promise((resolve, reject) => {
      let envInfo = this.currentEnvs[generatedEnvID];
      if (!envInfo) { return Promise.resolve(); }
      this.logger.info(`Stopping Environment: ${envInfo.suiteEnvID} ${generatedEnvID}`);

      // 1. identify the load removed from the host
      this.logger.debug('envInfo');
      this.logger.debug(envInfo)
      let port = this.currentHosts[envInfo.hostName].envs[generatedEnvID].port;
      // 2. stop the env
      let args = [generatedEnvID, envInfo.hostName, port, this.conf.filePaths.feenyDir];
      execFile(path.join(this.conf.filePaths.feenyDir, envInfo.stopScript), args)
        .then(() => {
          // 3. remove the load from the host
          this.currentHosts[envInfo.hostName].load -= envInfo.resourceCost;
          // 4. remove the env from currentEnvs
          delete this.currentEnvs[generatedEnvID];
          // 5. remove the env from the currentHosts
          delete this.currentHosts[envInfo.hostName].envs[generatedEnvID];

          this.logger.debug('this.currentHosts');
          this.logger.debug(this.currentHosts, true);
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });

  }

  async stopAll(cb) {
    let stopFns = _.map(this.currentEnvs, (envConf, generatedEnvID) => {
      return (cb2) => {
        this.stop(generatedEnvID)
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

  async start(generatedEnvID, suiteID, suiteEnvID) {
    await this.provisionEnv(generatedEnvID, suiteID, suiteEnvID);
    // should have some if logic here for the future when we support more than just api
    await this.confirmHealthcheck(generatedEnvID, suiteEnvID);
    let port = this.getPortForEnv(generatedEnvID);

    return generatedEnvID;
  }

  provisionEnv(generatedEnvID, suiteID, suiteEnvID) {
    return new Promise(async (resolve, reject) => {
      if (this.skipEnvProvisioning && (this.skipEnvProvisioning.indexOf(suiteID) !== -1)) {
        this.logger.info(`Skipping Environment provisioning for Test Suite '${suiteID}'`);
        return resolve();
      }

      this.logger.info(`Starting Environment: ${suiteEnvID} - ${generatedEnvID}`);

      try {
        let testSuiteConf = this.conf.parsedTestSuites[suiteID];
        // 1. identify the host that this env should deploy to
        let hostName = await this.getAvailableHostName(suiteID, suiteEnvID, generatedEnvID);
        let port;
        if (testSuiteConf.port) {
          // 2. identify the port that this env should use on this host
          port = await this.getAvailablePort(hostName, suiteID, generatedEnvID);
        }

        let args = [generatedEnvID, hostName, port, this.conf.filePaths.feenyDir];
        this.logger.debug('script args');
        this.logger.debug(args);
        const { stdout, stderr } = await execFile(path.join(this.conf.filePaths.feenyDir, testSuiteConf.env.startScript), args);

        if (stdout.includes("ready")) {
          this.logger.info(`${generatedEnvID} created.`);
          resolve(generatedEnvID);
        } else {
          reject("script did not contain 'ready'");
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  generateId() {
    return uuidv1();
  }

  getPortForEnv(generatedEnvID) {
    // 1. get host for env
    let hostName = this.currentEnvs[generatedEnvID].hostName;
    return this.currentHosts[hostName].envs[generatedEnvID].port;
  }

  /*
    Attempts to identify a host with enough capacity for an env of this suite type
  */
  async getAvailableHostName(suiteID, suiteEnvID, generatedEnvID) {
    return new Promise((resolve, reject) => {
      this.logger.debug(`getAvailableHostName ${suiteID} | ${suiteEnvID} | ${generatedEnvID}`);
      let suiteConf = Object.assign({}, this.conf.parsedTestSuites[suiteID]); //TODO: nullcheck
      let cost = suiteConf.env.resourceCost || 0;

      let identifyHost = (cb) => {
        // 1. calculate the capacity remaining for each host
        let capacityHosts = _.map(this.currentHosts, (hostInfo, hostName) => {
          return {
            name: hostName,
            remainingCapacity: hostInfo.capacity - hostInfo.load
          }
        });
        this.logger.debug('Hosts with capacity');
        this.logger.debug(capacityHosts, true);
        // 2. order hosts by remainingCapacity
        let freestHost = _.orderBy(capacityHosts, ['remainingCapacity'], 'desc')[0];
        this.logger.debug(`freestHost: ${freestHost.name}`);

        // 3. if the capacity of the host with the most left is greater than the suite env cost. return.
        if (freestHost && freestHost.remainingCapacity > cost) {
          cb(freestHost.name);
        } else {
          setTimeout(() => {identifyHost(cb)}, 3000);
        }
      };

      identifyHost((hostName) => {
        this.logger.debug('currentHosts');
        this.logger.debug(this.currentHosts, true);
        // 1. add the load to the host to reserve it;
        this.currentHosts[hostName].load += cost;
        // 2. add an entry for this env on this host (may get a port added in the next step)
        this.currentHosts[hostName].envs[generatedEnvID] = {};
        // 3. add this env to the currentEnvs object
        this.currentEnvs[generatedEnvID] =
          Object.assign(
            {},
            _.pick(suiteConf.env, ['startScript', 'stopScript', 'healthcheck']),
            _.pick(suiteConf, ['protocol', 'defaultRequestOpts', 'root']),
            {
              suiteID: suiteID,
              suiteEnvID: suiteEnvID,
              resourceCost: cost,
              hostName: hostName,
              testSets: suiteConf.testEnvs[suiteEnvID].testSets
            }
          );

        this.logger.debug('currentHosts updated');
        this.logger.debug(this.currentHosts, true);
        resolve(hostName);
      });
    });
  }

  async getAvailablePort(hostName, suiteID, generatedEnvID) {
    return new Promise((resolve, reject) => {
      this.logger.debug(`getAvailablePort ${hostName} | ${suiteID} | ${generatedEnvID}`);
      let hostConf = Object.assign({}, this.currentHosts[hostName]);
      let suiteConf = Object.assign({}, this.conf.parsedTestSuites[suiteID]);

      let identifyPort = (cb) => {
        // 1. find out the current ports in use.
        let portsInUse = [];
        _.forEach(hostConf, (hostInfo, hostName) => {
          _.forEach(hostInfo.envs, (envInfo, generatedEnvID) => {
            if (envInfo.port) {
              this.logger.debug(`port in use ${envInfo.port}`);
              portsInUse.push(envInfo.port);
            }
          });
        });

        // 2. attempt to find a port to use.
        let identifiedPort;
        if (portsInUse.indexOf(suiteConf.port) !== -1) {
          // port is in use
          if (suiteConf.parallel) {
            // in parallel mode we can increment the port and try again
            let nextPort = suiteConf.port + 1;
            while (!identifiedPort) {
              // if nextPort is open set it to identifiedPort
              if (portsInUse.indexOf(nextPort) == -1) {
                identifiedPort = nextPort;
              }
            }
          }
        } else {
          identifiedPort = suiteConf.port;
        }

        if (identifiedPort) {
          this.logger.debug(`available port identified ${identifiedPort}`);
          // assign the port to this currentEnv
          this.currentEnvs[generatedEnvID].port = identifiedPort;
          cb(identifiedPort);
        } else {
          setTimeout(identifyPort(cb, 3000));
        }
      };

      identifyPort((port) => {
        // add the port to hostConf to reserve it
        this.currentHosts[hostName].envs[generatedEnvID].port = port;
        resolve(port);
      });

    });
  }
  /*
    TODO: support multiple healthcheck types
  */
  confirmHealthcheck(generatedEnvID) {
    return new Promise((resolve, reject) => {
      this.logger.debug(`confirmHealthcheck ${generatedEnvID}`);
      let suiteEnvConf = this.currentEnvs[generatedEnvID]; // current-env-specific conf
      let healthcheckConf = suiteEnvConf.healthcheck;

      if (!healthcheckConf) {
        this.logger.info("No Healthcheck provided. Moving on.");
        return resolve();
      }

      if (!healthcheckConf.type) {
        this.logger.info("Healthcheck 'type' not provided. Skipping Healthcheck");
        return resolve();
      }

      if (healthcheckConf.type.toUpperCase() === "REST") {
        let port = this.currentHosts[suiteEnvConf.hostName].envs[generatedEnvID].port;
        let restManager = new RESTManager(this.conf, suiteEnvConf);
        let requestConf = healthcheckConf.request;
        let opts = restManager.buildRequest(requestConf, port);

        // retries the healthcheck endpoint every 3 seconds up to 20 times
        // when successful calls the cb passed to confirmHealthcheck()
        _async.retry({times: healthcheckConf.retries || 20, interval: opts.timeout},
          (asyncCb) => {
            this.logger.info(`Attempting healthcheck for ${generatedEnvID}...`);
            restManager.apiRequest(opts, (err, res, body) => {
              if (err) {
                asyncCb("failed");
                return;
              }

              if (res && res.statusCode === 200) {
                this.logger.info(`Healthcheck Confirmed for ${generatedEnvID}!`);
                asyncCb(null, true);
              } else {
                this.logger.debug(`Healthcheck returned: ${res.statusCode}`);
                asyncCb(`Healthcheck failed for ${generatedEnvID}`);
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
        this.logger.info("Healthcheck 'type' not recognized. Skipping Healthcheck");
        resolve();
      }

    });
  }

  getCurrentEnv(generatedEnvID) {
    return this.currentEnvs[generatedEnvID];
  }

}

module.exports = EnvManager;
