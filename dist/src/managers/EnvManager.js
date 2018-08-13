"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = require("child_process");
var uuid = require("uuid");
var path = require("path");
var _ = require("lodash");
var _async = require("async");
var portscanner = require("portscanner");
var busybee_util_1 = require("busybee-util");
var RESTClient_1 = require("../lib/RESTClient");
var TypedMap_1 = require("../lib/TypedMap");
var SuiteEnvInfo_1 = require("../lib/SuiteEnvInfo");
var busybee_util_2 = require("busybee-util");
var EnvManager = /** @class */ (function () {
    function EnvManager(conf) {
        this.conf = _.cloneDeep(conf);
        var loggerConf = new busybee_util_1.LoggerConf(this, conf.logLevel, null);
        this.logger = new busybee_util_1.Logger(loggerConf);
        if (conf.getSkipEnvProvisioning().length > 0) {
            this.skipEnvProvisioningList = conf.getSkipEnvProvisioning();
        }
        this.currentHosts = this.buildHosts(conf);
        this.currentEnvs = new TypedMap_1.TypedMap();
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
    EnvManager.prototype.buildHosts = function (conf) {
        this.logger.trace("buildHostConfs");
        // TODO add back
        // if (!conf.envResources.hosts) {
        //   this.logger.info("No host information provided. Only generatedEnvID info will be passed to scripts");
        //   return;
        // }
        var hosts = {};
        if (conf.localMode) {
            hosts['localhost'] = {
                load: 0,
                capacity: 100,
                envs: {}
            };
        }
        else {
            conf.envResources.forEach(function (envConfig) {
                envConfig.hosts.forEach(function (hostConfig) {
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
    };
    EnvManager.prototype.stop = function (generatedEnvID) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                this.logger.trace("stop " + generatedEnvID);
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var envInfo, ports, busybeeDir, args, filePath, e_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    envInfo = _.cloneDeep(this.currentEnvs.get(generatedEnvID));
                                    // remove the env from currentEnvs
                                    this.currentEnvs.remove(generatedEnvID);
                                    if (_.isEmpty(envInfo)) {
                                        return [2 /*return*/, resolve()];
                                    }
                                    if (this.shouldSkipProvisioning(envInfo.suiteID)) {
                                        this.logger.info("Skipping shutdown of '" + envInfo.suiteID + "'s environment. Suite's Environment was not provisioned by Busybee");
                                        return [2 /*return*/, resolve()];
                                    }
                                    this.logger.info("Stopping Environment: " + envInfo.suiteEnvID + " " + generatedEnvID);
                                    this.logger.trace('envInfo');
                                    this.logger.trace(envInfo);
                                    ports = this.currentHosts[envInfo.hostName].envs[generatedEnvID].ports;
                                    busybeeDir = this.conf.filePaths.busybeeDir;
                                    args = {
                                        generatedEnvID: generatedEnvID,
                                        protocol: envInfo.protocol,
                                        hostName: envInfo.hostName,
                                        ports: ports,
                                        busybeeDir: busybeeDir,
                                        startScriptReturnData: envInfo.getStartScriptReturnData(),
                                        startScriptErrorData: envInfo.getStartScriptErrorData(),
                                        stopData: envInfo.stopData
                                    };
                                    filePath = path.join(busybeeDir, envInfo.stopScript);
                                    this.logger.trace(filePath);
                                    this.logger.trace('scriptArgs');
                                    this.logger.trace(args, true);
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, this.runScript(filePath, [JSON.stringify(args)])];
                                case 2:
                                    _a.sent();
                                    // remove env info from the host
                                    this.removeEnvFromHost(envInfo.hostName, envInfo.resourceCost, generatedEnvID);
                                    this.logger.trace("this.currentHosts after removing " + generatedEnvID);
                                    this.logger.trace(this.currentHosts, true);
                                    resolve();
                                    return [3 /*break*/, 4];
                                case 3:
                                    e_1 = _a.sent();
                                    this.logger.debug("Error caught while stopping " + generatedEnvID);
                                    this.logger.info(e_1.message);
                                    // failed, add it back
                                    this.currentEnvs.set(generatedEnvID, envInfo);
                                    reject(e_1);
                                    return [2 /*return*/];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    EnvManager.prototype.removeEnvFromHost = function (hostName, resourceCost, generatedEnvID) {
        // remove the load from the host
        this.currentHosts[hostName].load -= resourceCost;
        // remove the env from the currentHosts
        delete this.currentHosts[hostName].envs[generatedEnvID];
    };
    EnvManager.prototype.stopAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                this.logger.trace('stopAll');
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var stopFns, e_2;
                        var _this = this;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    this.logger.trace('currentEnvs');
                                    this.logger.trace(this.currentEnvs);
                                    stopFns = [];
                                    this.currentEnvs.forEach(function (envConf, generatedEnvID) {
                                        stopFns.push(_this.stop.call(_this, generatedEnvID));
                                    });
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, Promise.all(stopFns)];
                                case 2:
                                    _a.sent();
                                    resolve();
                                    return [3 /*break*/, 4];
                                case 3:
                                    e_2 = _a.sent();
                                    reject(e_2);
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    EnvManager.prototype.retryStart = function (generatedEnvID, suiteID, suiteEnvID, failMsg) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.trace("retryStart " + generatedEnvID);
                        if (!(this.conf.parsedTestSuites.get(suiteID).testEnvs.get(suiteEnvID).retries < 3)) return [3 /*break*/, 2];
                        this.conf.parsedTestSuites.get(suiteID).testEnvs.get(suiteEnvID).retries += 1;
                        this.logger.info("Restart attempt number " + this.conf.parsedTestSuites.get(suiteID).testEnvs.get(suiteEnvID).retries + " for " + generatedEnvID);
                        return [4 /*yield*/, this.start(generatedEnvID, suiteID, suiteEnvID)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        this.logger.trace("retryStart attempts exceeded. failing");
                        // push to the back of the line and call start again.
                        throw new Error(failMsg);
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    EnvManager.prototype.start = function (generatedEnvID, suiteID, suiteEnvID) {
        return __awaiter(this, void 0, void 0, function () {
            var e_3, e_4, e_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.trace("start " + generatedEnvID);
                        this.envsWaitingForProvision.push(generatedEnvID);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.waitForTurn(generatedEnvID)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_3 = _a.sent();
                        throw new Error(generatedEnvID + " failed to wait it's turn");
                    case 4:
                        _a.trys.push([4, 6, , 9]);
                        return [4 /*yield*/, this.provisionEnv(generatedEnvID, suiteID, suiteEnvID)];
                    case 5:
                        _a.sent();
                        this.logger.trace(generatedEnvID + " provisioned successfully");
                        this.envsWaitingForProvision.shift();
                        return [3 /*break*/, 9];
                    case 6:
                        e_4 = _a.sent();
                        this.envsWaitingForProvision.shift();
                        return [4 /*yield*/, this.stop(generatedEnvID)];
                    case 7:
                        _a.sent(); // allow the user to do any potential background cleanup if necessary/possible
                        return [4 /*yield*/, this.retryStart(generatedEnvID, suiteID, suiteEnvID, generatedEnvID + " failed to provision")];
                    case 8:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 9:
                        this.logger.trace("envsWaitingForProvision updated to " + this.envsWaitingForProvision);
                        _a.label = 10;
                    case 10:
                        _a.trys.push([10, 12, , 14]);
                        return [4 /*yield*/, this.confirmHealthcheck(generatedEnvID)];
                    case 11:
                        _a.sent();
                        return [3 /*break*/, 14];
                    case 12:
                        e_5 = _a.sent();
                        return [4 /*yield*/, this.retryStart(generatedEnvID, suiteID, suiteEnvID, generatedEnvID + " failed to confirm the healthcheck")];
                    case 13:
                        _a.sent();
                        return [3 /*break*/, 14];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    EnvManager.prototype.waitForTurn = function (generatedEnvID) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) {
                        var wait = function (timeout, cb) {
                            _this.logger.trace("this.envsWaitingForProvision " + _this.envsWaitingForProvision);
                            if (_this.envsWaitingForProvision[0] != generatedEnvID) {
                                _this.logger.trace(generatedEnvID + " waiting its turn");
                                setTimeout(function () {
                                    wait(timeout, cb);
                                }, timeout);
                            }
                            else {
                                cb();
                            }
                        };
                        wait(3000, function () {
                            resolve();
                        });
                    })];
            });
        });
    };
    EnvManager.prototype.provisionEnv = function (generatedEnvID, suiteID, suiteEnvID) {
        var _this = this;
        return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
            var testSuiteConf, hostName, ports, busybeeDir, args, returnData, err_1, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.trace("provisionEnv " + generatedEnvID + " " + suiteID + " " + suiteEnvID);
                        this.logger.trace('currentHosts');
                        this.logger.trace(this.currentHosts, true);
                        if (this.shouldSkipProvisioning(suiteID)) {
                            this.logger.info("Skipping Environment provisioning for Test Suite '" + suiteID + "'");
                        }
                        else {
                            this.logger.info("Starting Environment: " + suiteEnvID + " - " + generatedEnvID);
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 9, , 10]);
                        testSuiteConf = this.conf.parsedTestSuites.get(suiteID);
                        return [4 /*yield*/, this.getAvailableHostName(suiteID, suiteEnvID, generatedEnvID)];
                    case 2:
                        hostName = _a.sent();
                        ports = void 0;
                        if (!testSuiteConf.ports) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.getAvailablePorts(hostName, suiteID, generatedEnvID)];
                    case 3:
                        // 2. identify the ports that this env should use on this host
                        ports = _a.sent();
                        _a.label = 4;
                    case 4:
                        if (this.shouldSkipProvisioning(suiteID)) {
                            resolve(generatedEnvID);
                            return [2 /*return*/];
                        }
                        busybeeDir = this.conf.filePaths.busybeeDir;
                        args = {
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
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, this.runScript(path.join(busybeeDir, testSuiteConf.env.startScript), [JSON.stringify(args)])];
                    case 6:
                        returnData = _a.sent();
                        if (returnData) {
                            this.currentEnvs.get(generatedEnvID).setStartScriptReturnData(returnData);
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        err_1 = _a.sent();
                        /*
                        set the error information so that it can be used by the stopScript
                        if necessary but then re-throw the error so that it can be handled by
                        the orchestrating fns.
                        */
                        this.currentEnvs.get(generatedEnvID).setStartScriptErrorData(err_1);
                        throw new Error(err_1);
                    case 8:
                        this.logger.info(generatedEnvID + " created.");
                        resolve(generatedEnvID);
                        return [3 /*break*/, 10];
                    case 9:
                        err_2 = _a.sent();
                        reject(err_2);
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        }); });
    };
    EnvManager.prototype.runScript = function (path, args) {
        var _this = this;
        return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
            var completeMessage, returned, script;
            var _this = this;
            return __generator(this, function (_a) {
                this.logger.info("runScript " + path + " <args>");
                this.logger.debug(args);
                completeMessage = path + " completed";
                returned = false;
                script = child_process_1.spawn('/bin/bash', [path, args]);
                // listen to stderr for errors and reject
                script.stderr.on('data', function (data) {
                    if (returned) {
                        return;
                    }
                    if (!data) {
                        data = "";
                    }
                    var dataStr = data.toString();
                    _this.logger.debug(dataStr);
                    if (dataStr.includes(EnvManager.BUSYBEE_ERROR)) {
                        returned = true;
                        reject(dataStr.replace(EnvManager.BUSYBEE_ERROR + " ", ''));
                        script.kill();
                    }
                });
                // listen to stdout for data
                script.stdout.on('data', function (data) {
                    if (returned || _.isEmpty(data)) {
                        return;
                    }
                    var lines = busybee_util_2.IOUtil.parseDataBuffer(data);
                    lines.forEach(function (l) {
                        _this.logger.debug(l);
                        if (l.includes(EnvManager.BUSYBEE_ERROR)) {
                            returned = true;
                            _this.logger.error(EnvManager.BUSYBEE_ERROR + " detected in " + path);
                            reject(l.replace(EnvManager.BUSYBEE_ERROR + " ", ''));
                            script.kill();
                        }
                        else if (l.includes(EnvManager.BUSYBEE_RETURN)) {
                            var returnedData = l.replace(EnvManager.BUSYBEE_RETURN + " ", '');
                            _this.logger.debug(path + " Returned data:");
                            _this.logger.debug(returnedData);
                            returned = true;
                            resolve(returnedData);
                            script.kill();
                            _this.logger.debug(completeMessage);
                        }
                        ;
                    });
                });
                // default return via script exit 0. no return value
                script.on('close', function () {
                    if (!returned) {
                        resolve();
                        _this.logger.debug(completeMessage);
                    }
                });
                return [2 /*return*/];
            });
        }); });
    };
    EnvManager.prototype.generateId = function () {
        return uuid.v1();
    };
    EnvManager.prototype.shouldSkipProvisioning = function (suiteID) {
        return this.skipEnvProvisioningList && (this.skipEnvProvisioningList.indexOf(suiteID) !== -1);
    };
    /*
     Attempts to identify a host with enough capacity for an env of this suite type
     */
    EnvManager.prototype.getAvailableHostName = function (suiteID, suiteEnvID, generatedEnvID) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.logger.trace("getAvailableHostName " + suiteID + " | " + suiteEnvID + " | " + generatedEnvID);
                        var suiteConf = _this.conf.parsedTestSuites.get(suiteID);
                        var cost = suiteConf.env.resourceCost || 0;
                        var identifyHost = function (cb) {
                            _this.logger.trace("identifyHost");
                            // see if we have a pre-determined host
                            if (suiteConf.host) {
                                return cb(suiteConf.host);
                            }
                            else if (_this.conf.localMode) {
                                return cb('localhost');
                            }
                            // 1. calculate the capacity remaining for each host
                            var capacityHosts = _.map(_this.currentHosts, function (hostInfo, hostName) {
                                return {
                                    name: hostName,
                                    remainingCapacity: hostInfo.capacity - hostInfo.load
                                };
                            });
                            _this.logger.trace('Hosts with capacity');
                            _this.logger.trace(capacityHosts, true);
                            // 2. order hosts by remainingCapacity
                            var freestHost = _.orderBy(capacityHosts, ['remainingCapacity'], 'desc')[0];
                            _this.logger.info(generatedEnvID + " Host with most capacity is " + freestHost.name);
                            // 3. if the capacity of the host with the most left is greater than the suite env cost. return.
                            if (freestHost && freestHost.remainingCapacity >= cost) {
                                cb(freestHost.name);
                            }
                            else {
                                _this.logger.info(generatedEnvID + " Host " + freestHost.name + " remaining capacity is " + freestHost.remainingCapacity + ". " + cost + " is required. Retrying...");
                                setTimeout(function () {
                                    identifyHost(cb);
                                }, 3000);
                            }
                        };
                        identifyHost(function (hostName) {
                            _this.logger.trace('currentHosts');
                            _this.logger.trace(_this.currentHosts, true);
                            // 1. add the load to the host to reserve it;
                            _this.currentHosts[hostName].load += cost;
                            // 2. add an entry for this env on this host (may get ports added in the next step)
                            _this.currentHosts[hostName].envs[generatedEnvID] = {};
                            // 3. add this env to the currentEnvs object
                            var envInfo = new SuiteEnvInfo_1.SuiteEnvInfo(suiteConf, suiteEnvID, cost, hostName);
                            _this.currentEnvs.set(generatedEnvID, envInfo);
                            _this.logger.trace('currentHosts updated');
                            _this.logger.trace(_this.currentHosts, true);
                            resolve(hostName);
                        });
                    })];
            });
        });
    };
    /*
     Discover available ports for a given hostName and suite definition
     */
    EnvManager.prototype.getAvailablePorts = function (hostName, suiteID, generatedEnvID) {
        var _this = this;
        return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
            var hostConf, suiteConf, ports, portsInUse, parallelMode, _a, ports, portOffset, e_6;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.logger.trace("getAvailablePorts " + hostName + " | " + suiteID + " | " + generatedEnvID);
                        hostConf = Object.assign({}, this.currentHosts[hostName]);
                        suiteConf = this.conf.parsedTestSuites.get(suiteID);
                        if (this.shouldSkipProvisioning(suiteID)) {
                            ports = suiteConf.ports;
                            // 3. update global host and env info
                            this.updateGlobalPortInfo(hostName, generatedEnvID, ports, 0);
                            return [2 /*return*/, resolve(ports)];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, this.getReservedBusybeePorts(hostConf)];
                    case 2:
                        portsInUse = _b.sent();
                        parallelMode = false;
                        if (suiteConf.env && suiteConf.env.parallel) {
                            parallelMode = suiteConf.env.parallel;
                        }
                        return [4 /*yield*/, this.identifyPorts(generatedEnvID, hostName, portsInUse, suiteConf.ports, 0, parallelMode)];
                    case 3:
                        _a = _b.sent(), ports = _a.ports, portOffset = _a.portOffset;
                        // 4. resolve :)
                        resolve(ports);
                        return [3 /*break*/, 5];
                    case 4:
                        e_6 = _b.sent();
                        this.logger.error("Error while getting available ports: " + e_6.message);
                        reject(e_6);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        }); });
    };
    EnvManager.prototype.updateGlobalPortInfo = function (hostName, generatedEnvID, ports, portOffset) {
        this.currentHosts[hostName].envs[generatedEnvID].ports = ports;
        this.currentHosts[hostName].envs[generatedEnvID].portOffset = portOffset;
        this.currentEnvs.get(generatedEnvID).ports = ports;
    };
    EnvManager.prototype.getReservedBusybeePorts = function (hostConf) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.logger.trace("getReservedBusybeePorts");
            _this.logger.trace(hostConf);
            var portsInUse = [];
            _.forEach(hostConf.envs, function (envInfo, generatedEnvID) {
                _this.logger.trace("envInfo");
                _this.logger.trace(envInfo);
                if (envInfo.ports) {
                    envInfo.ports.forEach(function (port) {
                        _this.logger.trace("port in use " + port);
                        portsInUse.push(port);
                    });
                }
            });
            resolve(portsInUse);
        });
    };
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
    EnvManager.prototype.identifyPorts = function (generatedEnvID, hostName, portsInUse, nextPorts, portOffset, parallelMode) {
        return __awaiter(this, void 0, void 0, function () {
            var portsInUseByBusybee, oldPorts, portsTaken, oldPorts, ret;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.trace("identifyPorts: " + generatedEnvID + " " + hostName + ", " + portsInUse + ", " + nextPorts + ", " + portOffset + ", " + parallelMode);
                        return [4 /*yield*/, this.arePortsInUseByBusybee(portsInUse, nextPorts)];
                    case 1:
                        portsInUseByBusybee = _a.sent();
                        this.logger.trace("portsInUseByBusybee: " + portsInUseByBusybee);
                        this.logger.trace("parallelMode: " + parallelMode);
                        if (!portsInUseByBusybee) return [3 /*break*/, 3];
                        oldPorts = nextPorts;
                        nextPorts = nextPorts.map(function (p) {
                            return p + 1;
                        });
                        this.logger.info(generatedEnvID + " Ports " + oldPorts + " in use by Busybee, retrying with " + nextPorts);
                        return [4 /*yield*/, this.identifyPorts(generatedEnvID, hostName, portsInUse, nextPorts, portOffset + 1, parallelMode)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        // first put a lock on these ports
                        this.updateGlobalPortInfo(hostName, generatedEnvID, nextPorts, portOffset);
                        return [4 /*yield*/, this.arePortsTaken(hostName, nextPorts)];
                    case 4:
                        portsTaken = _a.sent();
                        if (!portsTaken) return [3 /*break*/, 6];
                        oldPorts = nextPorts;
                        nextPorts = nextPorts.map(function (p) {
                            return p + 1;
                        });
                        this.logger.info(generatedEnvID + " Ports " + oldPorts + " in use by an unknown service, retrying with " + nextPorts);
                        return [4 /*yield*/, this.identifyPorts(generatedEnvID, hostName, portsInUse, nextPorts, portOffset + 1, parallelMode)];
                    case 5: return [2 /*return*/, _a.sent()];
                    case 6:
                        ret = {
                            ports: nextPorts,
                            portOffset: portOffset
                        };
                        this.logger.trace("ports identified: " + JSON.stringify(ret));
                        return [2 /*return*/, ret];
                }
            });
        });
    };
    /*
     Helper method for quickly checking if ports are known to be in use by busybee.
     Cheaper than checking the actual port via port scan.
     */
    EnvManager.prototype.arePortsInUseByBusybee = function (portsInUse, ports) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.logger.trace("arePortsInUseByBusybee " + portsInUse + " | " + ports);
                return [2 /*return*/, _.difference(ports, portsInUse).length < ports.length];
            });
        });
    };
    /*
     Checks if a list of [hostName:port] is in use
     */
    EnvManager.prototype.arePortsTaken = function (hostName, ports) {
        return __awaiter(this, void 0, void 0, function () {
            var takenPorts, portCheckPromises, results;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.trace("arePortsTaken " + hostName + " " + ports);
                        takenPorts = [];
                        portCheckPromises = ports.map(function (p) {
                            return _this.isPortTaken(hostName, p);
                        });
                        return [4 /*yield*/, Promise.all(portCheckPromises)];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, _.includes(results, true)];
                }
            });
        });
    };
    /*
     Checks if a single hostName:port is in use
     */
    EnvManager.prototype.isPortTaken = function (hostName, port) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.logger.trace("isPortTaken " + hostName + " " + port);
            portscanner.checkPortStatus(port, hostName, function (err, status) {
                // Status is 'open' if currently in use or 'closed' if available
                if (err)
                    return reject(err);
                if (status === 'open') {
                    _this.logger.trace(port + " is in use");
                    resolve(true);
                }
                else {
                    _this.logger.trace(port + " is available");
                    resolve(false);
                }
            });
        });
    };
    /*
     TODO: support multiple healthcheck types
     */
    EnvManager.prototype.confirmHealthcheck = function (generatedEnvID) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.logger.trace("confirmHealthcheck " + generatedEnvID);
            var suiteEnvConf = _this.currentEnvs.get(generatedEnvID); // current-env-specific conf
            _this.logger.trace(suiteEnvConf);
            var healthcheckConf = suiteEnvConf.healthcheck;
            if (!healthcheckConf) {
                _this.logger.info("No Healthcheck provided. Moving on.");
                return resolve();
            }
            if (!healthcheckConf.type) {
                _this.logger.info("Healthcheck 'type' not provided. Skipping Healthcheck");
                return resolve();
            }
            if (healthcheckConf.type.toUpperCase() === "REST") {
                var restClient_1 = new RESTClient_1.RESTClient(_this.conf, suiteEnvConf);
                var requestConf = healthcheckConf.request;
                // 1. get the initial healthcheckport definition from the
                var healthcheckPort_1;
                if (requestConf.port) {
                    healthcheckPort_1 = requestConf.port;
                }
                else {
                    healthcheckPort_1 = suiteEnvConf.ports[0]; // default to restapi path
                }
                // 2. get the port offset, apply.
                var portOffset = _this.currentHosts[suiteEnvConf.hostName].envs[generatedEnvID].portOffset;
                healthcheckPort_1 += portOffset;
                var opts_1 = restClient_1.buildRequest(requestConf, healthcheckPort_1);
                // retries the healthcheck path every 3 seconds up to 50 times
                // when successful calls the cb passed to confirmHealthcheck()
                var attempt_1 = 0;
                _async.retry({ times: healthcheckConf.retries || 50, interval: opts_1.timeout }, function (asyncCb) {
                    attempt_1 += 1;
                    _this.logger.info("Attempting " + attempt_1 + " healthcheck for " + generatedEnvID + " on port " + healthcheckPort_1);
                    _this.logger.debug(opts_1);
                    restClient_1.makeRequest(opts_1)
                        .then(function (response) {
                        if (response.statusCode === 200) {
                            _this.logger.info("Healthcheck Confirmed for " + generatedEnvID + "!");
                            asyncCb(null, true);
                        }
                        else {
                            _this.logger.debug("Healthcheck returned: " + response.statusCode);
                            _this.logger.trace(response, true);
                            asyncCb("Healthcheck failed for " + generatedEnvID);
                        }
                    })
                        .catch(function (err) {
                        _this.logger.error(err.message);
                        asyncCb("failed");
                    });
                }, function (err, results) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(results);
                    }
                });
            }
            else {
                _this.logger.info("Healthcheck 'type' not recognized. Skipping Healthcheck");
                resolve();
            }
        });
    };
    EnvManager.prototype.getCurrentEnv = function (generatedEnvID) {
        return this.currentEnvs.get(generatedEnvID);
    };
    EnvManager.prototype.getCurrentEnvs = function () {
        return this.currentEnvs;
    };
    EnvManager.prototype.getCurrentHosts = function () {
        return this.currentHosts;
    };
    EnvManager.prototype.getRunTimestamp = function () {
        return this.conf.runTimestamp;
    };
    EnvManager.prototype.getRunId = function () {
        return this.conf.runId;
    };
    EnvManager.BUSYBEE_ERROR = 'BUSYBEE_ERROR';
    EnvManager.BUSYBEE_RETURN = 'BUSYBEE_RETURN';
    return EnvManager;
}());
exports.EnvManager = EnvManager;
//# sourceMappingURL=EnvManager.js.map