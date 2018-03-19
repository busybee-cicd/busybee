import {spawn} from 'child_process';
import * as uuid from 'uuid';
import * as path from 'path';
import * as _ from 'lodash';
import * as _async from 'async';
import * as portscanner from 'portscanner';
import {Logger} from '../lib/Logger';
import {RESTClient} from '../lib/RESTClient';
import {BusybeeParsedConfig} from "../models/config/BusybeeParsedConfig";
import {EnvResourceConfig} from "../models/config/common/EnvResourceConfig";
import {HostConfig} from "../models/config/user/HostConfig";
import {RequestOptsConfig} from "../models/config/common/RequestOptsConfig";
import {TypedMap} from "../lib/TypedMap";
import {ParsedTestSuite} from "../models/config/parsed/ParsedTestSuiteConfig";
import {SuiteEnvInfo} from "../lib/SuiteEnvInfo";


export class EnvManager {
  private conf: BusybeeParsedConfig;
  private logger: Logger;
  private skipEnvProvisioningList: string[];
  private envsWaitingForProvision: string[];
  private currentHosts: any;
  private currentEnvs: TypedMap<SuiteEnvInfo>;

  constructor(conf: BusybeeParsedConfig) {
    this.conf = _.cloneDeep(conf);
    this.logger = new Logger(conf, this);
    if (conf.getSkipEnvProvisioning().length > 0) {
      this.skipEnvProvisioningList = conf.getSkipEnvProvisioning();
    }
    this.currentHosts = this.buildHosts(conf);
    this.currentEnvs = new TypedMap<SuiteEnvInfo>();

    this.envsWaitingForProvision = [];
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
  buildHosts(conf: BusybeeParsedConfig) {
    this.logger.trace(`buildHostConfs`);
    // TODO add back
    // if (!conf.envResources.hosts) {
    //   this.logger.info("No host information provided. Only generatedEnvID info will be passed to scripts");
    //   return;
    // }
    let hosts = {};
    if (conf.localMode) {
      hosts['localhost'] = {
        load: 0,
        capacity: 100,
        envs: {}
      }
    } else {
      conf.envResources.forEach((envConfig: EnvResourceConfig) => {
        envConfig.hosts.forEach((hostConfig: HostConfig) => {
          hosts[hostConfig.name] = {
            load: 0,
            capacity: hostConfig.capacity || 100,
            envs: {}
          }
        });
      });
    }

    this.logger.trace(hosts, true);
    return hosts;
  }

  async stop(generatedEnvID: string) {
    this.logger.trace(`stop ${generatedEnvID}`);
    return new Promise(async(resolve, reject) => {
      let envInfo = _.cloneDeep(this.currentEnvs.get(generatedEnvID));
      // remove the env from currentEnvs
      this.currentEnvs.remove(generatedEnvID);

      if (_.isEmpty(envInfo)) {
        return resolve();
      }

      if (this.shouldSkipProvisioning(envInfo.suiteID)) {
        this.logger.info(`Skipping shutdown of '${envInfo.suiteID}'s environment. Suite's Environment was not provisioned by Busybee`);
        return resolve();
      }

      this.logger.info(`Stopping Environment: ${envInfo.suiteEnvID} ${generatedEnvID}`);

      this.logger.trace('envInfo');
      this.logger.trace(envInfo)
      let ports = this.currentHosts[envInfo.hostName].envs[generatedEnvID].ports;
      let busybeeDir = this.conf.filePaths.busybeeDir;
      let args = {
        generatedEnvID: generatedEnvID,
        protocol: envInfo.protocol,
        hostName: envInfo.hostName,
        ports: ports,
        busybeeDir: busybeeDir
      };

      let filePath = path.join(busybeeDir, envInfo.stopScript);
      this.logger.trace(filePath);
      this.logger.trace('scriptArgs');
      this.logger.trace(args, true);

      // 1. stop the env
      try {

        await this.runScript(filePath, [JSON.stringify(args)]);

        this.currentHosts[envInfo.hostName].load -= envInfo.resourceCost;
        // remove the env from the currentHosts
        delete this.currentHosts[envInfo.hostName].envs[generatedEnvID];

        this.logger.trace('this.currentHosts');
        this.logger.trace(this.currentHosts, true);
        resolve();
      } catch (e) {
        this.logger.info(e.message);
        // failed, add it back
        this.currentEnvs.set(generatedEnvID, envInfo);
        reject(e);
        return;
      }
    });

  }

  async stopAll() {
    this.logger.trace('stopAll');

    return new Promise(async(resolve, reject) => {
      this.logger.trace('currentEnvs');
      this.logger.trace(this.currentEnvs);
      let stopFns = [];
      this.currentEnvs.forEach((envConf: SuiteEnvInfo, generatedEnvID: string) => {
        stopFns.push(this.stop.call(this, generatedEnvID));
      });

      try {
        await Promise.all(stopFns);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  async start(generatedEnvID, suiteID, suiteEnvID) {
    this.envsWaitingForProvision.push(generatedEnvID);
    try {
      await this.waitForTurn(generatedEnvID);
    } catch (e) {
      throw new Error(`${generatedEnvID} failed to wait it's turn`);
    }

    try {
      await this.provisionEnv(generatedEnvID, suiteID, suiteEnvID);
    } catch (e) {
      throw new Error(`${generatedEnvID} failed provision`);
    }

    this.envsWaitingForProvision.shift();
    this.logger.trace(`envsWaitingForProvision updated to ${this.envsWaitingForProvision}`);
    // should have some if logic here for the future when we support more than just api

    try {
      await this.confirmHealthcheck(generatedEnvID);
    } catch (e) {
      throw new Error(`${generatedEnvID} failed to confirm the healthcheck`);
    }

    return;
  }

  async waitForTurn(generatedEnvID) {
    return new Promise((resolve) => {
      let wait = (timeout, cb) => {
        this.logger.trace(`this.envsWaitingForProvision ${this.envsWaitingForProvision}`);
        if (this.envsWaitingForProvision[0] != generatedEnvID) {
          this.logger.trace(`${generatedEnvID} waiting its turn`);
          setTimeout(() => {
            wait(timeout, cb)
          }, timeout);
        } else {
          cb();
        }
      };

      wait(3000, () => {
        resolve();
      });
    })
  }

  provisionEnv(generatedEnvID, suiteID, suiteEnvID) {
    return new Promise(async(resolve, reject) => {
      this.logger.trace(`provisionEnv ${generatedEnvID} ${suiteID} ${suiteEnvID}`);
      this.logger.trace('currentHosts');
      this.logger.trace(this.currentHosts, true);
      if (this.shouldSkipProvisioning(suiteID)) {
        this.logger.info(`Skipping Environment provisioning for Test Suite '${suiteID}'`);
      } else {
        this.logger.info(`Starting Environment: ${suiteEnvID} - ${generatedEnvID}`);
      }

      try {
        let testSuiteConf = this.conf.parsedTestSuites.get(suiteID);
        // 1. identify the host that this env should deploy to
        let hostName = await this.getAvailableHostName(suiteID, suiteEnvID, generatedEnvID);
        let ports;
        if (testSuiteConf.ports) {
          // 2. identify the ports that this env should use on this host
          ports = await this.getAvailablePorts(hostName, suiteID, generatedEnvID);
        }

        if (this.shouldSkipProvisioning(suiteID)) {
          resolve(generatedEnvID);
          return;
        }

        let busybeeDir = this.conf.filePaths.busybeeDir;
        let args = {
          generatedEnvID: generatedEnvID,
          protocol: testSuiteConf.protocol,
          hostName: hostName,
          ports: ports,
          busybeeDir: busybeeDir
        };

        this.logger.trace('script args');
        this.logger.trace(testSuiteConf.env.startScript);
        this.logger.trace(args);
        await this.runScript(path.join(busybeeDir, testSuiteConf.env.startScript), [JSON.stringify(args)]);

        this.logger.info(`${generatedEnvID} created.`);
        resolve(generatedEnvID);
      } catch (err) {
        reject(err);
      }
    });
  }

  runScript(path, args) {
    return new Promise(async(resolve, reject) => {
      this.logger.info(`runScript ${path} <args>`);
      this.logger.debug(args);
      const completeMessage = `${path} completed`;
      let returned = false;

      const script = spawn('/bin/bash', [path, args]);

      // listen for errors and reject
      script.stderr.on('data', (data) => {
        if (returned) {
          return;
        }
        if (!data) {
          data = "";
        }
        let output = data.toString();
        this.logger.debug(output);

        if (output.toUpperCase().includes("BUSYBEE_SH_ERROR")) {
          returned = true;
          reject(output);
          script.kill('SIGHUP');
        }
      });

      // listen for data and discern if an error has been thrown.
      script.stdout.on('data', (data) => {
        if (returned) {
          return;
        }
        if (!data) {
          return;
        }
        let origOutput = data.toString();
        let upperOutput = origOutput.toUpperCase();
        this.logger.debug(origOutput);

        if (upperOutput.includes("BUSYBEE_SH_ERROR")) {
          returned = true;
          this.logger.error(`BUSYBEE_SH_ERROR detected in ${path}`);
          reject(origOutput);
          script.kill('SIGHUP');
        } else if (upperOutput.includes("BUSYBEE_SH_COMPLETE")) {
          returned = true;
          resolve(completeMessage);
          script.kill('SIGHUP');
        }
        ;
      });

      script.on('close', () => {
        if (!returned) {
          resolve(completeMessage);
        }
      });
    });
  }

  generateId() {
    return uuid.v1();
  }

  shouldSkipProvisioning(suiteID: string) {
    return this.skipEnvProvisioningList && (this.skipEnvProvisioningList.indexOf(suiteID) !== -1);
  }

  /*
   Attempts to identify a host with enough capacity for an env of this suite type
   */
  async getAvailableHostName(suiteID, suiteEnvID, generatedEnvID) {
    return new Promise((resolve, reject) => {
      this.logger.trace(`getAvailableHostName ${suiteID} | ${suiteEnvID} | ${generatedEnvID}`);
      this.logger.trace(this.conf.parsedTestSuites.get(suiteID));
      let suiteConf: ParsedTestSuite = this.conf.parsedTestSuites.get(suiteID);
      let cost = suiteConf.env.resourceCost || 0;

      let identifyHost = (cb) => {
        this.logger.trace(`identifyHost`);
        // see if we have a pre-determined host
        if (suiteConf.host) {
          return cb(suiteConf.host);
        } else if (this.conf.localMode) {
          return cb('localhost');
        }
        // 1. calculate the capacity remaining for each host
        let capacityHosts = _.map(this.currentHosts, (hostInfo: any, hostName) => {
          return {
            name: hostName,
            remainingCapacity: hostInfo.capacity - hostInfo.load
          }
        });
        this.logger.trace('Hosts with capacity');
        this.logger.trace(capacityHosts, true);
        // 2. order hosts by remainingCapacity
        let freestHost = _.orderBy(capacityHosts, ['remainingCapacity'], 'desc')[0];
        this.logger.info(`${generatedEnvID} Host with most capacity is ${freestHost.name}`);

        // 3. if the capacity of the host with the most left is greater than the suite env cost. return.
        if (freestHost && freestHost.remainingCapacity >= cost) {
          cb(freestHost.name);
        } else {
          this.logger.info(`${generatedEnvID} Host ${freestHost.name} remaining capacity is ${freestHost.remainingCapacity}. ${cost} is required. Retrying...`);
          setTimeout(() => {
            identifyHost(cb)
          }, 3000);
        }
      };

      identifyHost((hostName) => {
        this.logger.trace('currentHosts');
        this.logger.trace(this.currentHosts, true);
        // 1. add the load to the host to reserve it;
        this.currentHosts[hostName].load += cost;
        // 2. add an entry for this env on this host (may get ports added in the next step)
        this.currentHosts[hostName].envs[generatedEnvID] = {};
        // 3. add this env to the currentEnvs object
        let envInfo = new SuiteEnvInfo(suiteConf, suiteID, suiteEnvID, cost, hostName);
        this.currentEnvs.set(generatedEnvID, envInfo);

        this.logger.trace('currentHosts updated');
        this.logger.trace(this.currentHosts, true);
        resolve(hostName);
      });
    });
  }

  /*
   Discover available ports for a given hostName and suite definition
   */
  getAvailablePorts(hostName, suiteID, generatedEnvID) {
    return new Promise(async(resolve, reject) => {
      this.logger.trace(`getAvailablePorts ${hostName} | ${suiteID} | ${generatedEnvID}`);
      let hostConf = Object.assign({}, this.currentHosts[hostName]);
      let suiteConf = this.conf.parsedTestSuites.get(suiteID);

      if (this.shouldSkipProvisioning(suiteID)) {
        let ports = suiteConf.ports;
        // 3. update global host and env info
        this.updateGlobalPortInfo(hostName, generatedEnvID, ports, 0);
        return resolve(ports);
      }

      // 1. find the current ports in use for this host
      try {
        let portsInUse = await this.getReservedBusybeePorts(hostConf);
        this.logger.trace('portsInUse');
        this.logger.trace(portsInUse);
        // 2. determine available ports
        let parallelMode = false;
        if (suiteConf.env && suiteConf.env.parallel) {
          parallelMode = suiteConf.env.parallel;
        }
        let {ports, portOffset} =
          await this.identifyPorts(generatedEnvID, hostName, portsInUse, suiteConf.ports, 0, parallelMode);
        // 3. update global host and env info
        this.updateGlobalPortInfo(hostName, generatedEnvID, ports, portOffset);

        // 4. resolve :)
        resolve(ports);
      } catch (e) {
        this.logger.error(`Error while getting available ports: ${e.message}`);
        reject(e);
      }
    });
  }

  updateGlobalPortInfo(hostName: string, generatedEnvID: string, ports: number[], portOffset: number) {
    this.currentHosts[hostName].envs[generatedEnvID].ports = ports;
    this.currentHosts[hostName].envs[generatedEnvID].portOffset = portOffset;
    this.currentEnvs.get(generatedEnvID).ports = ports;
  }

  getReservedBusybeePorts(hostConf) {
    return new Promise((resolve, reject) => {
      this.logger.trace(`getReservedBusybeePorts`);
      this.logger.trace(hostConf);
      let portsInUse = [];
      _.forEach(hostConf.envs, (envInfo, generatedEnvID) => {
        this.logger.trace(`envInfo`)
        this.logger.trace(envInfo);
        if (envInfo.ports) {
          envInfo.ports.forEach((port) => {
            this.logger.trace(`port in use ${port}`);
            portsInUse.push(port);
          });
        }
      });

      resolve(portsInUse)
    });
  }

  /*
   Recursively check for available ports

   IF (parallelMode)
   IF (portsTaken)
   increment ports and try again
   ELSE
   we've identified available ports, return
   ELSE
   IF (portsTaken)
   do not increment ports, try again
   */
  async identifyPorts(generatedEnvID, hostName, portsInUse, nextPorts, portOffset, parallelMode) {
    this.logger.trace(`identifyPorts: ${generatedEnvID} ${hostName}, ${portsInUse}, ${nextPorts}, ${portOffset}, ${parallelMode}`);
    let portsInUseByBusybee = await this.arePortsInUseByBusybee(portsInUse, nextPorts);
    this.logger.trace(`portsInUseByBusybee: ${portsInUseByBusybee}`);
    this.logger.trace(`parallelMode: ${parallelMode}`);

    if (parallelMode) {
      if (portsInUseByBusybee) {
        let oldPorts = nextPorts;
        nextPorts = nextPorts.map((p) => {
          return p + 1
        });
        this.logger.info(`${generatedEnvID} Ports ${oldPorts} in use by Busybee, retrying with ${nextPorts}`);
        return await this.identifyPorts(generatedEnvID, hostName, portsInUse, nextPorts, portOffset + 1, parallelMode);
      } else {
        // not in use by busybee. see if ports are in use by something else
        let portsTaken = await this.arePortsTaken(hostName, nextPorts);
        if (portsTaken) {
          // shift ports and try again
          let oldPorts = nextPorts;
          nextPorts = nextPorts.map((p) => {
            return p + 1
          });
          this.logger.info(`${generatedEnvID} Ports ${oldPorts} in use by an unknown service, retrying with ${nextPorts}`);
          return await this.identifyPorts(generatedEnvID, hostName, portsInUse, nextPorts, portOffset + 1, parallelMode);
        }

        // ports identified, resolve.
        let ret = {
          ports: nextPorts,
          portOffset: portOffset
        };

        this.logger.trace(`ports identified: ${JSON.stringify(ret)}`);
        return ret;
      }
    } else {
      if (portsInUseByBusybee) {
        this.logger.trace(`parallelMode:false. Ports in use by Busybee, retrying...`);
        this.logger.info(`${generatedEnvID} Ports in use by Busybee, retrying ${nextPorts}`);
        return await this.identifyPorts(generatedEnvID, hostName, portsInUse, nextPorts, portOffset, parallelMode);
      } else {
        // not in use by busybee. see if ports are in use by something else
        let portsTaken = await this.arePortsTaken(hostName, nextPorts);
        if (portsTaken) {
          // DONT shift ports and try again
          this.logger.info(`${generatedEnvID} Ports in use by an unknown service, retrying ${nextPorts}`);
          return await this.identifyPorts(generatedEnvID, hostName, portsInUse, nextPorts, portOffset, parallelMode);
        }

        // ports identified, resolve.
        let ret = {
          ports: nextPorts,
          portOffset: portOffset
        };

        this.logger.trace(`ports identified: ${JSON.stringify(ret)}`);
        return ret;
      }
    }
  }

  /*
   Helper method for quickly checking if ports are known to be in use by busybee.
   Cheaper than checking the actual port via port scan.
   */
  async arePortsInUseByBusybee(portsInUse, ports) {
    this.logger.trace(`arePortsInUseByBusybee ${portsInUse} | ${ports}`);
    return _.difference(ports, portsInUse).length < ports.length;
  }

  /*
   Checks if a list of [hostName:port] is in use
   */
  async arePortsTaken(hostName, ports) {
    this.logger.trace(`arePortsTaken ${hostName} ${ports}`);
    let takenPorts = [];
    let portCheckPromises = ports.map((p) => {
      return this.isPortTaken(hostName, p);
    });

    let results = await Promise.all(portCheckPromises);
    return _.includes(results, true);
  }

  /*
   Checks if a single hostName:port is in use
   */
  isPortTaken(hostName, port) {
    return new Promise((resolve, reject) => {
      this.logger.trace(`isPortTaken ${hostName} ${port}`);
      portscanner.checkPortStatus(port, hostName, (err, status) => {
        // Status is 'open' if currently in use or 'closed' if available
        if (err) return reject(err);
        if (status === 'open') {
          this.logger.trace(`${port} is in use`);
          resolve(true);
        } else {
          this.logger.trace(`${port} is available`);
          resolve(false);
        }
      })
    });
  }

  /*
   TODO: support multiple healthcheck types
   */
  confirmHealthcheck(generatedEnvID) {
    return new Promise((resolve, reject) => {
      this.logger.trace(`confirmHealthcheck ${generatedEnvID}`);
      let suiteEnvConf = this.currentEnvs.get(generatedEnvID); // current-env-specific conf
      this.logger.trace(suiteEnvConf);
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
        let requestConf: RequestOptsConfig = healthcheckConf.request;

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
        _async.retry({times: healthcheckConf.retries || 50, interval: opts.timeout},
          (asyncCb) => {
            this.logger.info(`Attempting healthcheck for ${generatedEnvID} on port ${healthcheckPort}`);
            this.logger.debug(opts);
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

  getCurrentEnv(generatedEnvID): SuiteEnvInfo {
    return this.currentEnvs.get(generatedEnvID);
  }

}
