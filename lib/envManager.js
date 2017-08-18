const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const { spawn } = require('child_process');
const uuidv1 = require('uuid/v1');
const path = require('path');
const _async = require('async');
const Logger = require('./logger');
const _ = require('lodash');
const RESTClient = require('./RESTClient');

class EnvManager {
  constructor(conf) {
    this.conf = conf;
    this.logger = new Logger(conf, this);
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
        'ports': [8080],
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
          ports: [8080],
          portOffset: 0
        }
      }
     },
    'host2': {
      'capacity': 0,
      'envs': {
        '222-222-222-222': {
          ports: [8080],
          portOffset: 0
        }
      }
    }
  }

  currentEnvs
  {
    '111-111-111-111': {
      'suiteId': 'test suite 1',
      'suiteEnvID': ''
      'hostName': 'host1',
      'resourceCost': 100,
      'startScript': '',
      'stopScript': '',
      'testSets': []
    },
    '222-222-222-222': {
      'suiteId': 'test suite 1',
      'suiteEnvID': ''
      'hostName': 'host2',
      'resourceCost': 100,
      'startScript': '',
      'stopScript': ''
      'testSets': []
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
    if (conf.cmdOpts.localMode) {
      this.currentHosts['localhost'] = {
        load: 0,
        capacity: 100,
        envs: {}
      }
    } else {
      conf.envResources.hosts.forEach((hostConfig) => {
        this.currentHosts[hostConfig.name] = {
          load: 0,
          capacity: hostConfig.capacity || 100,
          envs: {}
        }
      });
    }
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
      let envInfo = Object.assign({}, this.currentEnvs[generatedEnvID]);
      // remove the env from currentEnvs
      delete this.currentEnvs[generatedEnvID];

      if (_.isEmpty(envInfo)) { return Promise.resolve(); }
      this.logger.info(`Stopping Environment: ${envInfo.suiteEnvID} ${generatedEnvID}`);

      this.logger.debug('envInfo');
      this.logger.debug(envInfo)
      let ports = this.currentHosts[envInfo.hostName].envs[generatedEnvID].ports;
      let busybeeDir = this.conf.filePaths.busybeeDir;
      let args = {
        generatedEnvID: generatedEnvID,
        protocol: envInfo.protocol,
        hostName: envInfo.hostName,
        ports: ports,
        busybeeDir: busybeeDir
      };

      // 1. stop the env
      execFile(path.join(busybeeDir, envInfo.stopScript), [JSON.stringify(args)])
        .then((stdout) => {
          // 3. remove the load from the host
          this.currentHosts[envInfo.hostName].load -= envInfo.resourceCost;
          // remove the env from the currentHosts
          delete this.currentHosts[envInfo.hostName].envs[generatedEnvID];

          this.logger.debug('this.currentHosts');
          this.logger.debug(this.currentHosts, true);
          resolve();
        })
        .catch((err) => {
          // failed, add it back
          this.currentEnvs[generatedEnvID] = envInfo;
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

  runScript(path, args) {
    return new Promise(async (resolve, reject) => {
      this.logger.info(`runScript ${path} <args>`);
      this.logger.info(args);

      const script = spawn('sh', [path, args]);

      script.stdout.on('data', (data) => {
        this.logger.debug(data.toString());
      });

      script.stderr.on('data', (data) => {
        if (data.toString().toUpperCase().includes("ERROR")) {
          this.logger.debug('Error in runScript');
          reject(data.toString());
        };
      });

      script.on('close', (code) => {
        resolve(`${path} completed`);
      });
    });
  }

  async start(generatedEnvID, suiteID, suiteEnvID) {
    await this.provisionEnv(generatedEnvID, suiteID, suiteEnvID);
    // should have some if logic here for the future when we support more than just api
    await this.confirmHealthcheck(generatedEnvID, suiteEnvID);

    return generatedEnvID;
  }

  provisionEnv(generatedEnvID, suiteID, suiteEnvID) {
    return new Promise(async (resolve, reject) => {
      this.logger.debug(`provisionEnv ${generatedEnvID} ${suiteID} $suiteEnvID`);
      let skipEnvProvisioning = false;
      if (this.skipEnvProvisioning && (this.skipEnvProvisioning.indexOf(suiteID) !== -1)) {
        skipEnvProvisioning = true;
        this.logger.info(`Skipping Environment provisioning for Test Suite '${suiteID}'`);
      } else {
        this.logger.info(`Starting Environment: ${suiteEnvID} - ${generatedEnvID}`);
      }

      try {
        let testSuiteConf = this.conf.parsedTestSuites[suiteID];
        // 1. identify the host that this env should deploy to
        let hostName = await this.getAvailableHostName(suiteID, suiteEnvID, generatedEnvID, skipEnvProvisioning);
        let ports;
        if (testSuiteConf.ports) {
          // 2. identify the ports that this env should use on this host
          ports = await this.getAvailablePorts(hostName, suiteID, generatedEnvID);
        }

        let busybeeDir = this.conf.filePaths.busybeeDir;
        let args = {
          generatedEnvID: generatedEnvID,
          protocol: testSuiteConf.protocol,
          hostName: hostName,
          ports: ports,
          busybeeDir: busybeeDir
        };

        if (skipEnvProvisioning) {
          resolve(generatedEnvID);
          return;
        }

        this.logger.debug('script args');
        this.logger.debug(args);
        const { stdout, stderr } = await execFile(path.join(busybeeDir, testSuiteConf.env.startScript), [JSON.stringify(args)]);

        this.logger.debug(`stdout ${stdout}`);
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
        if (freestHost && freestHost.remainingCapacity >= cost) {
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
        // 2. add an entry for this env on this host (may get ports added in the next step)
        this.currentHosts[hostName].envs[generatedEnvID] = {};
        // 3. add this env to the currentEnvs object
        this.currentEnvs[generatedEnvID] =
          Object.assign(
            {},
            _.pick(suiteConf.env, ['startScript', 'stopScript', 'runScript', 'healthcheck']),
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

  async getAvailablePorts(hostName, suiteID, generatedEnvID) {
    return new Promise((resolve, reject) => {
      this.logger.debug(`getAvailablePorts ${hostName} | ${suiteID} | ${generatedEnvID}`);
      let hostConf = Object.assign({}, this.currentHosts[hostName]);
      let suiteConf = Object.assign({}, this.conf.parsedTestSuites[suiteID]);

      let identifyPorts = (cb) => {
        // 1. find out the current ports in use.
        let portsInUse = [];
        _.forEach(hostConf, (hostInfo, hostName) => {
          _.forEach(hostInfo.envs, (envInfo, generatedEnvID) => {
            if (envInfo.ports) {
              envInfo.ports.forEach((port) => {
                this.logger.debug(`port in use ${port}`);
                portsInUse.push(envInfo.port);
              });
            }
          });
        });

        // 2. attempt to find a port to use.
        let identifiedPorts;
        let portOffset = 0; // used for determining the correct healthcheck port (if necessary)
        if (_.difference(suiteConf.ports, portsInUse).length < suiteConf.ports.length) {
          // port is in use
          if (suiteConf.parallel) {
            // in parallel mode we can increment the port and try again
            let nextPorts = suiteConf.ports.map((p) => { return p + 1 });
            portOffset += 1;
            this.logger.debug(`Ports in use. Trying nextPorts: ${nextPorts}`);
            while (!identifiedPorts) {
              // if nextPort is open set it to identifiedPort
              if (_.difference(nextPorts, portsInUse).length === nextPorts.length) {
                identifiedPorts = nextPorts;
              } else {
                nextPorts = nextPorts.ports.map((p) => { return p + 1 });
                portOffset += 1;
                this.logger.debug(`Ports in use. Trying nextPorts: ${nextPorts}`);
              }
            }
          }
        } else {
          identifiedPorts = suiteConf.ports;
        }

        if (identifiedPorts) {
          this.logger.debug(`available ports identified ${identifiedPorts}`);
          // assign the port to this currentEnv
          this.currentEnvs[generatedEnvID].ports = identifiedPorts;
          cb(identifiedPorts, portOffset);
        } else {
          setTimeout(identifyPorts(cb, 3000));
        }
      };

      identifyPorts((ports, portOffset) => {
        // add the ports to hostConf to reserve them
        this.currentHosts[hostName].envs[generatedEnvID].ports = ports;
        this.currentHosts[hostName].envs[generatedEnvID].portOffset = portOffset;
        resolve(ports);
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
        let restClient = new RESTClient(this.conf, suiteEnvConf);
        let requestConf = healthcheckConf.request;

        // 1. get the initial healthcheckport definition from the
        let healthcheckPort;
        if (requestConf.port) {
          healthcheckPort = requestConf.port;
        } else {
          healthcheckPort = suiteEnvConf.ports[0]; // default to restapi endpoint
        }
        // 2. get the port offset, apply.
        let portOffset = this.currentHosts[suiteEnvConf.hostName].envs[generatedEnvID].portOffset
        healthcheckPort += portOffset;
        let opts = restClient.buildRequest(requestConf, healthcheckPort);

        // retries the healthcheck endpoint every 3 seconds up to 20 times
        // when successful calls the cb passed to confirmHealthcheck()
        _async.retry({times: healthcheckConf.retries || 20, interval: opts.timeout},
          (asyncCb) => {
            this.logger.info(`Attempting healthcheck for ${generatedEnvID}...`);
            restClient.makeRequest(opts, (err, res, body) => {
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
