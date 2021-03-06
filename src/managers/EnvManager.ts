import { spawn } from 'child_process';
import * as uuid from 'uuid';
import * as path from 'path';
import * as _ from 'lodash';
import * as portscanner from 'portscanner';
import * as promiseTools from 'promise-tools';
import { Logger, LoggerConf } from 'busybee-util';
import { RESTClient } from '../lib/RESTClient';
import { BusybeeParsedConfig } from '../models/config/BusybeeParsedConfig';
import { EnvResourceConfig } from '../models/config/common/EnvResourceConfig';
import { HostConfig } from '../models/config/user/HostConfig';
import { RequestOptsConfig } from '../models/config/common/RequestOptsConfig';
import { TypedMap } from '../lib/TypedMap';
import { ParsedTestSuite } from '../models/config/parsed/ParsedTestSuiteConfig';
import { SuiteEnvInfo } from '../lib/SuiteEnvInfo';
import { IOUtil } from 'busybee-util';

export class EnvManager {
  private conf: BusybeeParsedConfig;
  private logger: Logger;
  private skipEnvProvisioningList: string[];
  private envsWaitingForProvision: string[];
  private currentHosts: any;
  private currentEnvs: TypedMap<SuiteEnvInfo>;
  private static BUSYBEE_ERROR: string = 'BUSYBEE_ERROR';
  private static BUSYBEE_RETURN: string = 'BUSYBEE_RETURN';

  constructor(conf: BusybeeParsedConfig) {
    this.conf = _.cloneDeep(conf);
    const loggerConf = new LoggerConf(this, conf.logLevel, null);
    this.logger = new Logger(loggerConf);
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
   'path': '/healthcheck',
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
      };
    } else {
      conf.envResources.forEach((envConfig: EnvResourceConfig) => {
        envConfig.hosts.forEach((hostConfig: HostConfig) => {
          hosts[hostConfig.name] = {
            load: 0,
            capacity: hostConfig.capacity || 100,
            envs: {}
          };
        });
      });
    }

    this.logger.trace(hosts, true);
    return hosts;
  }

  async stop(generatedEnvID: string) {
    this.logger.trace(`stop ${generatedEnvID}`);

    let envInfo = _.cloneDeep(this.currentEnvs.get(generatedEnvID));
    // remove the env from currentEnvs
    this.currentEnvs.remove(generatedEnvID);

    if (_.isEmpty(envInfo)) {
      return;
    }

    if (this.shouldSkipProvisioning(envInfo.suiteID)) {
      this.logger.info(
        `Skipping shutdown of '${
          envInfo.suiteID
        }'s environment. Suite's Environment was not provisioned by Busybee`
      );
      return;
    }

    this.logger.info(
      `Stopping Environment: ${envInfo.suiteEnvID} ${generatedEnvID}`
    );

    this.logger.trace('envInfo');
    this.logger.trace(envInfo);
    let ports = this.currentHosts[envInfo.hostName].envs[generatedEnvID].ports;
    let busybeeDir = this.conf.filePaths.busybeeDir;
    let args = {
      generatedEnvID: generatedEnvID,
      protocol: envInfo.protocol,
      hostName: envInfo.hostName,
      ports: ports,
      busybeeDir: busybeeDir,
      startScriptReturnData: envInfo.getStartScriptReturnData(),
      startScriptErrorData: envInfo.getStartScriptErrorData(),
      stopData: envInfo.stopData
    };

    let filePath = path.join(busybeeDir, envInfo.stopScript);
    this.logger.trace(filePath);
    this.logger.trace('scriptArgs');
    this.logger.trace(args, true);

    // 1. stop the env
    try {
      await this.runScript(filePath, [JSON.stringify(args)]);

      // remove env info from the host
      this.removeEnvFromHost(
        envInfo.hostName,
        envInfo.resourceCost,
        generatedEnvID
      );

      this.logger.trace(`this.currentHosts after removing ${generatedEnvID}`);
      this.logger.trace(this.currentHosts, true);
    } catch (e) {
      this.logger.debug(`Error caught while stopping ${generatedEnvID}`);
      this.logger.info(e.message);
      // failed, add it back
      this.currentEnvs.set(generatedEnvID, envInfo);
      throw e;
    }
  }

  removeEnvFromHost(
    hostName: string,
    resourceCost: number,
    generatedEnvID: string
  ) {
    // remove the load from the host
    this.currentHosts[hostName].load -= resourceCost;
    // remove the env from the currentHosts
    delete this.currentHosts[hostName].envs[generatedEnvID];
  }

  async stopAll() {
    this.logger.trace('stopAll');

    this.logger.trace('currentEnvs');
    this.logger.trace(this.currentEnvs);
    let stopFns = [];
    this.currentEnvs.forEach(
      (envConf: SuiteEnvInfo, generatedEnvID: string) => {
        stopFns.push(this.stop.call(this, generatedEnvID));
      }
    );

    await Promise.all(stopFns);
  }

  async retryStart(
    generatedEnvID: string,
    suiteID: string,
    suiteEnvID: string,
    failMsg: string
  ) {
    this.logger.trace(`retryStart ${generatedEnvID}`);
    await this.stop(generatedEnvID); // allow the user to do any potential background cleanup if necessary/possible and remove load from hosts
    // in both cases we need to remove the load that was reserved from this env
    if (
      this.conf.parsedTestSuites.get(suiteID).testEnvs.get(suiteEnvID).retries <
      3
    ) {
      this.conf.parsedTestSuites
        .get(suiteID)
        .testEnvs.get(suiteEnvID).retries += 1;
      this.logger.info(
        `Restart attempt number ${
          this.conf.parsedTestSuites.get(suiteID).testEnvs.get(suiteEnvID)
            .retries
        } for ${generatedEnvID}`
      );
      await this.start(generatedEnvID, suiteID, suiteEnvID);
    } else {
      this.logger.trace(`retryStart attempts exceeded. failing`);
      // push to the back of the line and call start again.
      throw new Error(failMsg);
    }
  }

  async start(generatedEnvID: string, suiteID: string, suiteEnvID: string) {
    this.logger.trace(`start ${generatedEnvID}`);
    this.envsWaitingForProvision.push(generatedEnvID);
    try {
      await this.waitForTurn(generatedEnvID);
    } catch (e) {
      throw new Error(`${generatedEnvID} failed to wait it's turn`);
    }

    try {
      await this.provisionEnv(generatedEnvID, suiteID, suiteEnvID);
      this.logger.trace(`${generatedEnvID} provisioned successfully`);
      this.envsWaitingForProvision.shift();
    } catch (e) {
      this.envsWaitingForProvision.shift();
      await this.retryStart(
        generatedEnvID,
        suiteID,
        suiteEnvID,
        `${generatedEnvID} failed to provision`
      );
    }

    this.logger.trace(
      `envsWaitingForProvision updated to ${this.envsWaitingForProvision}`
    );

    // should have some if logic here for the future when we support more than just api

    try {
      await this.confirmHealthcheck(generatedEnvID);
    } catch (e) {
      await this.retryStart(
        generatedEnvID,
        suiteID,
        suiteEnvID,
        `${generatedEnvID} failed to confirm the healthcheck`
      );
    }

    return;
  }

  async waitForTurn(generatedEnvID) {
    let wait = async (timeout: number) => {
      this.logger.trace(
        `this.envsWaitingForProvision ${this.envsWaitingForProvision}`
      );
      if (this.envsWaitingForProvision[0] != generatedEnvID) {
        this.logger.trace(`${generatedEnvID} waiting its turn`);
        await promiseTools.delay(timeout);
        return await wait(timeout);
      }
    };

    await wait(3000);
  }

  async provisionEnv(generatedEnvID, suiteID, suiteEnvID) {
    this.logger.trace(
      `provisionEnv ${generatedEnvID} ${suiteID} ${suiteEnvID}`
    );
    this.logger.trace('currentHosts');
    this.logger.trace(this.currentHosts, true);
    if (this.shouldSkipProvisioning(suiteID)) {
      this.logger.info(
        `Skipping Environment provisioning for Test Suite '${suiteID}'`
      );
    } else {
      this.logger.info(
        `Will Provision Environment: ${suiteEnvID} - ${generatedEnvID}`
      );
    }

    let testSuiteConf = this.conf.parsedTestSuites.get(suiteID);
    // 1. identify the host that this env should deploy to
    let hostName = await this.getAvailableHostName(
      suiteID,
      suiteEnvID,
      generatedEnvID
    );
    let ports;
    if (testSuiteConf.ports) {
      // 2. identify the ports that this env should use on this host
      ports = await this.getAvailablePorts(hostName, suiteID, generatedEnvID);
    }

    if (this.shouldSkipProvisioning(suiteID)) {
      return generatedEnvID;
    }

    let busybeeDir = this.conf.filePaths.busybeeDir;
    let args = {
      generatedEnvID: generatedEnvID,
      protocol: testSuiteConf.protocol,
      hostName: hostName,
      ports: ports,
      busybeeDir: busybeeDir,
      startData: this.currentEnvs.get(generatedEnvID).startData
    };

    this.logger.trace('script args');
    this.logger.trace(testSuiteConf.env.startScript);
    this.logger.trace(args);
    try {
      this.logger.info(
        `Starting Environment: ${suiteEnvID} - ${generatedEnvID}`
      );
      let returnData = await this.runScript(
        path.join(busybeeDir, testSuiteConf.env.startScript),
        [JSON.stringify(args)]
      );

      if (returnData) {
        this.currentEnvs
          .get(generatedEnvID)
          .setStartScriptReturnData(returnData);
      }
    } catch (err) {
      /*
      set the error information so that it can be used by the stopScript
      if necessary but then re-throw the error so that it can be handled by
      the orchestrating fns.
      */
      this.currentEnvs.get(generatedEnvID).setStartScriptErrorData(err);
      throw new Error(err);
    }

    this.logger.info(`${generatedEnvID} created.`);
    return generatedEnvID;
  }

  runScript(path, args): Promise<string> {
    return new Promise(async (resolve, reject) => {
      this.logger.info(`runScript ${path} <args>`);
      this.logger.debug(args);
      this.logger.trace('With process.env');
      this.logger.trace(process.env);
      const completeMessage = `${path} completed`;
      let returned = false;
      const script = spawn('/bin/bash', [path, args], { env: process.env });

      // listen to stderr for errors and reject
      script.stderr.on('data', data => {
        if (returned) {
          return;
        }
        if (!data) {
          data = '';
        }
        let dataStr = data.toString();
        this.logger.debug(dataStr);

        if (dataStr.includes(EnvManager.BUSYBEE_ERROR)) {
          returned = true;
          reject(dataStr.replace(`${EnvManager.BUSYBEE_ERROR} `, ''));
          script.kill();
        }
      });

      // listen to stdout for data
      script.stdout.on('data', data => {
        if (returned || _.isEmpty(data)) {
          return;
        }

        let lines = IOUtil.parseDataBuffer(data);
        lines.forEach(l => {
          this.logger.debug(l);

          if (l.includes(EnvManager.BUSYBEE_ERROR)) {
            returned = true;
            this.logger.error(
              `${EnvManager.BUSYBEE_ERROR} detected in ${path}`
            );
            reject(l.replace(`${EnvManager.BUSYBEE_ERROR} `, ''));
            script.kill();
          } else if (l.includes(EnvManager.BUSYBEE_RETURN)) {
            let returnedData = l.replace(`${EnvManager.BUSYBEE_RETURN} `, '');
            this.logger.debug(`${path} Returned data:`);
            this.logger.debug(returnedData);
            returned = true;
            resolve(returnedData);
            script.kill();
            this.logger.debug(completeMessage);
          }
        });
      });

      // default return via script exit 0. no return value
      script.on('close', () => {
        if (!returned) {
          resolve();
          this.logger.debug(completeMessage);
        }
      });
    });
  }

  generateId() {
    return uuid.v1();
  }

  shouldSkipProvisioning(suiteID: string) {
    return (
      this.skipEnvProvisioningList &&
      this.skipEnvProvisioningList.indexOf(suiteID) !== -1
    );
  }

  /*
    Returns an available host give a suite
  */
  async getAvailableHostName(suiteID, suiteEnvID, generatedEnvID) {
    this.logger.trace(
      `getAvailableHostName ${suiteID} | ${suiteEnvID} | ${generatedEnvID}`
    );
    let suiteConf: ParsedTestSuite = this.conf.parsedTestSuites.get(suiteID);
    let cost: number = suiteConf.env.resourceCost || 0;

    let hostName = await this.identifyHost(suiteConf, cost, generatedEnvID);

    this.logger.trace('currentHosts');
    this.logger.trace(this.currentHosts, true);
    // 1. add the load to the host to reserve it;
    this.currentHosts[hostName].load += cost;
    // 2. add an entry for this env on this host (may get ports added in the next step)
    this.currentHosts[hostName].envs[generatedEnvID] = {};
    // 3. add this env to the currentEnvs object
    let envInfo = new SuiteEnvInfo(suiteConf, suiteEnvID, cost, hostName);
    this.currentEnvs.set(generatedEnvID, envInfo);

    this.logger.trace('currentHosts updated');
    this.logger.trace(this.currentHosts, true);

    return hostName;
  }

  /*
    Attempts to identify a host with enough capacity for an env of this suite type
  */
  async identifyHost(
    suiteConf: ParsedTestSuite,
    cost: number,
    generatedEnvID: string
  ) {
    this.logger.trace(`identifyHost`);
    // see if we have a pre-determined host
    if (suiteConf.host) {
      return suiteConf.host;
    } else if (this.conf.localMode) {
      return 'localhost';
    }
    // 1. calculate the capacity remaining for each host
    let capacityHosts = _.map(this.currentHosts, (hostInfo: any, hostName) => {
      return {
        name: hostName,
        remainingCapacity: hostInfo.capacity - hostInfo.load
      };
    });
    this.logger.trace('Hosts with capacity');
    this.logger.trace(capacityHosts, true);
    // 2. order hosts by remainingCapacity
    let freestHost = _.orderBy(capacityHosts, ['remainingCapacity'], 'desc')[0];
    this.logger.info(
      `${generatedEnvID} Host with most capacity is ${freestHost.name}`
    );

    // 3. if the capacity of the host with the most left is greater than the suite env cost. return.
    if (freestHost && freestHost.remainingCapacity >= cost) {
      return freestHost.name;
    } else {
      this.logger.info(
        `${generatedEnvID} Host ${freestHost.name} remaining capacity is ${
          freestHost.remainingCapacity
        }. ${cost} is required. Retrying...`
      );

      // loop
      await promiseTools.delay(3000);
      return await this.identifyHost(suiteConf, cost, generatedEnvID);
    }
  }

  /*
   Discover available ports for a given hostName and suite definition
   */
  async getAvailablePorts(hostName, suiteID, generatedEnvID) {
    this.logger.trace(
      `getAvailablePorts ${hostName} | ${suiteID} | ${generatedEnvID}`
    );
    let hostConf = Object.assign({}, this.currentHosts[hostName]);
    let suiteConf = this.conf.parsedTestSuites.get(suiteID);

    if (this.shouldSkipProvisioning(suiteID)) {
      let ports = suiteConf.ports;
      // 3. update global host and env info
      this.updateGlobalPortInfo(hostName, generatedEnvID, ports, 0);
      return ports;
    }

    // 1. find the current ports in use for this host
    try {
      let portsInUse = await this.getReservedBusybeePorts(hostConf);
      // 2. determine available ports
      let parallelMode = false;
      if (suiteConf.env && suiteConf.env.parallel) {
        parallelMode = suiteConf.env.parallel;
      }
      let { ports, portOffset } = await this.identifyPorts(
        generatedEnvID,
        hostName,
        portsInUse,
        suiteConf.ports,
        0,
        parallelMode
      );

      // 4. resolve :)
      return ports;
    } catch (e) {
      this.logger.error(`Error while getting available ports: ${e.message}`);
      throw e;
    }
  }

  updateGlobalPortInfo(
    hostName: string,
    generatedEnvID: string,
    ports: number[],
    portOffset: number
  ) {
    this.currentHosts[hostName].envs[generatedEnvID].ports = ports;
    this.currentHosts[hostName].envs[generatedEnvID].portOffset = portOffset;
    this.currentEnvs.get(generatedEnvID).ports = ports;
  }

  getReservedBusybeePorts(hostConf) {
    this.logger.trace(`getReservedBusybeePorts`);
    this.logger.trace(hostConf);
    let portsInUse = [];
    Object.keys(hostConf.envs).forEach(generatedEnvID => {
      let envInfo = hostConf.envs[generatedEnvID];

      this.logger.trace(`envInfo`);
      this.logger.trace(envInfo);
      if (envInfo.ports) {
        envInfo.ports.forEach(port => {
          this.logger.trace(`port in use ${port}`);
          portsInUse.push(port);
        });
      }
    });

    return portsInUse;
  }

  /*
   Recursively check for available ports
   TODO: Fix this to not care about parallelMode...it shouldn't be the job of this method to worry about that. it has been removed from the logic, not from the signature

   IF (parallelMode)
    IF (portsTaken)
      increment ports and try again
    ELSE
      we've identified available ports, return
   ELSE
    IF (portsTaken)
      do not increment ports, try again
   */
  async identifyPorts(
    generatedEnvID,
    hostName,
    portsInUse,
    nextPorts,
    portOffset,
    parallelMode
  ) {
    this.logger.trace(
      `identifyPorts: ${generatedEnvID} ${hostName}, ${portsInUse}, ${nextPorts}, ${portOffset}, ${parallelMode}`
    );
    let portsInUseByBusybee = await this.arePortsInUseByBusybee(
      portsInUse,
      nextPorts
    );
    this.logger.trace(`portsInUseByBusybee: ${portsInUseByBusybee}`);
    this.logger.trace(`parallelMode: ${parallelMode}`);

    if (portsInUseByBusybee) {
      let oldPorts = nextPorts;
      nextPorts = nextPorts.map(p => {
        return p + 1;
      });
      this.logger.info(
        `${generatedEnvID} Ports ${oldPorts} in use by Busybee, retrying with ${nextPorts}`
      );
      return await this.identifyPorts(
        generatedEnvID,
        hostName,
        portsInUse,
        nextPorts,
        portOffset + 1,
        parallelMode
      );
    } else {
      // first put a lock on these ports
      this.updateGlobalPortInfo(
        hostName,
        generatedEnvID,
        nextPorts,
        portOffset
      );
      // not in use by busybee. see if ports are in use by something else
      let portsTaken = await this.arePortsTaken(hostName, nextPorts);
      if (portsTaken) {
        // shift ports and try again
        let oldPorts = nextPorts;
        nextPorts = nextPorts.map(p => {
          return p + 1;
        });
        this.logger.info(
          `${generatedEnvID} Ports ${oldPorts} in use by an unknown service, retrying with ${nextPorts}`
        );
        return await this.identifyPorts(
          generatedEnvID,
          hostName,
          portsInUse,
          nextPorts,
          portOffset + 1,
          parallelMode
        );
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
    let portCheckPromises = ports.map(p => {
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
      });
    });
  }

  /*
   TODO: support multiple healthcheck types
   */
  async confirmHealthcheck(generatedEnvID) {
    this.logger.trace(`confirmHealthcheck ${generatedEnvID}`);
    let suiteEnvConf = this.currentEnvs.get(generatedEnvID); // current-env-specific conf
    this.logger.trace(suiteEnvConf);
    let healthcheckConf = suiteEnvConf.healthcheck;

    if (!healthcheckConf) {
      this.logger.info('No Healthcheck provided. Moving on.');
      return;
    }

    if (!healthcheckConf.type) {
      this.logger.info("Healthcheck 'type' not provided. Skipping Healthcheck");
      return;
    }

    if (healthcheckConf.type.toUpperCase() === 'REST') {
      let restClient = new RESTClient(this.conf, suiteEnvConf);
      let requestConf: RequestOptsConfig = healthcheckConf.request;

      // 1. get the initial healthcheckport definition from the
      let healthcheckPort;
      if (requestConf.port) {
        healthcheckPort = requestConf.port;
      } else {
        healthcheckPort = suiteEnvConf.ports[0]; // default to restapi path
      }
      // 2. get the port offset, apply.
      let portOffset = this.currentHosts[suiteEnvConf.hostName].envs[
        generatedEnvID
      ].portOffset;
      healthcheckPort += portOffset;
      let opts = restClient.buildRequest(requestConf, healthcheckPort);

      // retries the healthcheck path every 3 seconds up to 50 times
      // when successful calls the cb passed to confirmHealthcheck()
      let attempt = 0;
      return await promiseTools.retry(
        { times: healthcheckConf.retries || 50, interval: opts.timeout },
        async () => {
          attempt += 1;
          this.logger.info(
            `Attempting healthcheck #${attempt} for ${generatedEnvID} on port ${healthcheckPort}`
          );
          this.logger.debug(opts);
          let response = await restClient.makeRequest(opts);
          this.logger.debug(response);
          if (response.statusCode === 200) {
            this.logger.info(`Healthcheck Confirmed for ${generatedEnvID}!`);
            return true;
          } else {
            this.logger.debug(`Healthcheck returned: ${response.statusCode}`);
            this.logger.trace(response, true);
            throw new Error(`Healthcheck failed for ${generatedEnvID}`);
          }
        }
      );
    } else {
      this.logger.info(
        "Healthcheck 'type' not recognized. Skipping Healthcheck"
      );
      return;
    }
  }

  getCurrentEnv(generatedEnvID): SuiteEnvInfo {
    return this.currentEnvs.get(generatedEnvID);
  }

  getCurrentEnvs(): TypedMap<SuiteEnvInfo> {
    return this.currentEnvs;
  }

  getCurrentHosts(): any {
    return this.currentHosts;
  }

  getRunTimestamp(): number {
    return this.conf.runTimestamp;
  }

  getRunId(): string {
    return this.conf.runId;
  }
}
