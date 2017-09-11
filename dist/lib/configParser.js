"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var glob = require("glob");
var fs = require("fs");
var _ = require("lodash");
var path = require("path");
var uuidv1 = require("uuid/v1");
var Logger_1 = require("./Logger");
var ConfigParser = /** @class */ (function () {
    function ConfigParser(cmdOpts) {
        var dir = cmdOpts.directory ? cmdOpts.directory : 'busybee';
        var cFile = cmdOpts.config ? cmdOpts.config : 'config.json';
        this.busybeeDirPath = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
        this.cFilePath = path.join(this.busybeeDirPath, cFile);
        this.cmdOpts = cmdOpts;
        this.testSet2EnvMap = {};
        this.env2TestSuiteMap = {};
        this.logLevel = this.getLogLevel(cmdOpts);
        this.logger = new Logger_1.Logger({ logLevel: this.logLevel }, this);
        if (cmdOpts.localMode) {
            this.logger.info("LocalMode detected. Host Configuration will be ignored in favor of 'localhost'");
        }
    }
    ConfigParser.prototype.getLogLevel = function (cmdOpts) {
        var logLevel;
        if (process.env.BUSYBEE_DEBUG) {
            logLevel = 'DEBUG';
        }
        else if (process.env.BUSYBEE_LOG_LEVEL) {
            if (Logger_1.Logger.isLogLevel(process.env.BUSYBEE_LOG_LEVEL)) {
                logLevel = process.env.BUSYBEE_LOG_LEVEL;
            }
        }
        else if (cmdOpts) {
            if (this.cmdOpts.debug) {
                logLevel = 'DEBUG';
            }
            else if (cmdOpts.logLevel) {
                if (Logger_1.Logger.isLogLevel(cmdOpts.logLevel)) {
                    logLevel = cmdOpts.logLevel;
                }
            }
        }
        return logLevel;
    };
    ConfigParser.prototype.parse = function (mode) {
        var conf = JSON.parse(fs.readFileSync(this.cFilePath, 'utf8'));
        Object.assign(conf, {
            filePaths: {
                config: this.cFilePath,
                busybeeDir: this.busybeeDirPath
            },
            cmdOpts: this.cmdOpts,
            logLevel: this.logLevel
        });
        conf = this.prepTestSuites(conf, mode);
        return this.parseFiles(conf, mode);
    };
    ConfigParser.prototype.prepTestSuites = function (conf, mode) {
        var _this = this;
        /*
          Goal here is to build an object that looks like
          {
            testEnvs: {
              'default': {
                id: 'default',
                testSets: {
                  'default': {
                    id: 'default',
                    tests: []
                  }
                }
              }
            }
          }
    
          And a map for easily identifying which env a testSet is a member of (for parsing mocks later)
          {
            "testSetId": "envId"
          }
        */
        this.logger.debug("prepTestSuites");
        conf.parsedTestSuites = {};
        var skipTestSuites;
        if (this.cmdOpts.skipTestSuite) {
            skipTestSuites = this.cmdOpts.skipTestSuite.split(',');
        }
        conf.testSuites.forEach(function (testSuite) {
            var suiteID = testSuite.id || uuidv1();
            if (skipTestSuites && skipTestSuites.indexOf(suiteID)) {
                return;
            }
            conf = _this.parseTestSuite(conf, testSuite, suiteID, mode);
        });
        return conf;
    };
    ConfigParser.prototype.parseTestSuite = function (conf, testSuite, suiteID, mode) {
        var _this = this;
        this.logger.debug("parseTestSuite " + testSuite + " " + suiteID);
        // create an id for this testSuite
        conf.parsedTestSuites[suiteID] = Object.assign(testSuite, { suiteID: suiteID }, { testEnvs: {} });
        if (testSuite.type == 'REST') {
            // assign a default env to this TestSuite incase they add tests that don't specify an Env to run in
            conf.parsedTestSuites[suiteID].testEnvs['default'] = { suiteEnvID: 'default', testSets: [{ id: 'default' }] };
            if (mode == 'mock') {
                conf.parsedTestSuites[suiteID].envInstances.push({
                    id: 'default',
                    testSets: [
                        {
                            id: 'default'
                        }
                    ]
                });
            }
        }
        // iterate each env defined for this testSuite.
        conf.parsedTestSuites[suiteID].envInstances.forEach(function (testEnvConf) {
            // rename the env's id to suiteEnvID for clarity later 'id' gets thrown around a lot.
            testEnvConf.suiteEnvID = testEnvConf.id;
            delete testEnvConf.id;
            // add this env to the env2TestSuiteMap
            _this.logger.debug('testEnvConf');
            _this.logger.debug(JSON.stringify(testEnvConf));
            _this.env2TestSuiteMap[testEnvConf.suiteEnvID] = suiteID;
            var testSetStubs = {};
            if (testEnvConf.testSets) {
                testEnvConf.testSets.forEach(function (testSetConf) {
                    // testSetStubs is a placeholder object to ensure that there is a 'tests'
                    // array ready to accept tests during the test parsing step
                    if (testSetStubs[testSetConf.id]) {
                        _this.logger.info("Test set " + testSetConf.id + " already exists. Skipping");
                        return;
                    }
                    testSetStubs[testSetConf.id] = Object.assign({}, testSetConf, { tests: [] });
                    // store env lookup for later
                    _this.testSet2EnvMap[testSetConf.id] = testEnvConf.suiteEnvID;
                });
            }
            conf.parsedTestSuites[suiteID].testEnvs[testEnvConf.suiteEnvID] =
                Object.assign(testEnvConf, { testSets: testSetStubs });
        });
        return conf;
    };
    ConfigParser.prototype.parseFiles = function (conf, mode) {
        var _this = this;
        this.logger.debug("parseFiles");
        var files = glob.sync(this.busybeeDirPath + "/**/*.json", { ignore: "" + this.cFilePath });
        // parse json files, compile testSets and add them to the conf.
        this.logger.info("parsing files...");
        files.forEach(function (file) {
            _this.logger.info(file);
            var data = fs.readFileSync(file, 'utf8');
            var tests = JSON.parse(data);
            if (!Array.isArray(tests)) {
                tests = [tests];
            }
            tests.forEach(function (test) {
                if (mode == 'test') {
                    if (test.mock || test.skip) {
                        return;
                    }
                }
                if (mode == 'mock') {
                    test.testSet = { id: 'default' };
                }
                if (_.isUndefined(test.testSet)) {
                    _this.logger.info("test '" + test.name + "' does not contain required prop 'testSet'. Skipping");
                    return;
                }
                // suport multiple testSets
                if (!Array.isArray(test.testSet)) {
                    test.testSet = [test.testSet];
                }
                // iterate each testSet entry for this test (1 test can run in multiple testSets)
                test.testSet.forEach(function (testSetInfo) {
                    // lookup the env that this TestSet is a member of
                    _this.logger.debug(JSON.stringify(_this.testSet2EnvMap));
                    _this.logger.debug(JSON.stringify(_this.env2TestSuiteMap));
                    if (_.isUndefined(_this.testSet2EnvMap[testSetInfo.id])) {
                        _this.logger.warn("Unable to identify the Test Environment containing the testSetId '" + testSetInfo.id + "'.");
                        return;
                    }
                    var testEnvId = _this.testSet2EnvMap[testSetInfo.id];
                    // lookup the suite that this env is a member of
                    if (_.isUndefined(_this.env2TestSuiteMap[testEnvId])) {
                        _this.logger.warn("Unable to identify the Test Suite containing the envId " + testEnvId + ".");
                        return;
                    }
                    var suiteID = _this.env2TestSuiteMap[testEnvId];
                    _this.logger.debug("suiteID: " + suiteID);
                    if (_.isUndefined(testSetInfo.index)) {
                        // push it on the end
                        conf.parsedTestSuites[suiteID].testEnvs[testEnvId].testSets[testSetInfo.id].tests.push(test);
                        //conf.restApi.testEnvs[testEnvId].testSets[testSetInfo.id].tests.push(test);
                    }
                    else {
                        // insert it at the proper index, fill any empty spots along the way
                        Array(testSetInfo.index + 1).fill(null).forEach(function (d, i) {
                            if (i == testSetInfo.index) {
                                conf.parsedTestSuites[suiteID].testEnvs[testEnvId].testSets[testSetInfo.id].tests[i] = test;
                            }
                            else {
                                if (!conf.parsedTestSuites[suiteID].testEnvs[testEnvId].testSets[testSetInfo.id].tests[i]) {
                                    conf.parsedTestSuites[suiteID].testEnvs[testEnvId].testSets[testSetInfo.id].tests[i] = {};
                                }
                            }
                        });
                    }
                });
            });
        });
        return conf;
    };
    return ConfigParser;
}());
exports.ConfigParser = ConfigParser;
//# sourceMappingURL=ConfigParser.js.map