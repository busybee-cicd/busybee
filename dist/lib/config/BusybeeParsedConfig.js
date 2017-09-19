"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var uuidv1 = require("uuid/v1");
var Logger_1 = require("../Logger");
var glob = require("glob");
var fs = require("fs");
var _ = require("lodash");
var ParsedTestSuiteConfig_1 = require("./parsed/ParsedTestSuiteConfig");
var FilePathsConfig_1 = require("./parsed/FilePathsConfig");
var TypedMap_1 = require("../TypedMap");
var BusybeeParsedConfig = /** @class */ (function () {
    function BusybeeParsedConfig(userConfig, cmdOpts, mode) {
        this.testSet2EnvMap = new TypedMap_1.TypedMap();
        this.env2TestSuiteMap = new TypedMap_1.TypedMap();
        this.cmdOpts = cmdOpts;
        this.logLevel = this.getLogLevel(cmdOpts);
        this.logger = new Logger_1.Logger({ logLevel: this.logLevel }, this);
        this.filePaths = new FilePathsConfig_1.FilePathsConfig(cmdOpts);
        this.onComplete = userConfig.onComplete;
        this.parsedTestSuites = this.parseTestSuites(userConfig, mode);
        this.envResources = userConfig.envResources;
        if (cmdOpts.localMode) {
            this.logger.info("LocalMode detected. Host Configuration will be ignored in favor of 'localhost'");
        }
    }
    BusybeeParsedConfig.prototype.toJSON = function () {
        return {
            parsedTestSuites: this.parsedTestSuites,
            envResources: this.envResources,
            logLevel: this.logLevel
        };
    };
    BusybeeParsedConfig.prototype.parseTestSuites = function (userConf, mode) {
        var _this = this;
        var parsedTestSuites = new TypedMap_1.TypedMap();
        // see if the user specified to skip testSuites
        var skipTestSuites;
        if (this.cmdOpts.skipTestSuite) {
            skipTestSuites = this.cmdOpts.skipTestSuite.split(',');
        }
        userConf.testSuites.forEach(function (testSuite) {
            var suiteID = testSuite.id || uuidv1();
            if (skipTestSuites && skipTestSuites.indexOf(suiteID)) {
                return;
            }
            // parse this testSuite
            var parsedTestSuite = _this.parseTestSuite(testSuite, suiteID, mode);
            parsedTestSuites.set(parsedTestSuite.suiteID, parsedTestSuite);
            _this.logger.debug(_this.parsedTestSuites, true);
        });
        return this.parseTestFiles(parsedTestSuites, mode);
    };
    BusybeeParsedConfig.prototype.parseTestSuite = function (testSuite, suiteID, mode) {
        this.logger.debug("parseTestSuite userConf testSuite " + suiteID + " " + mode);
        // create an id for this testSuite
        return new ParsedTestSuiteConfig_1.ParsedTestSuite(testSuite, mode, this.testSet2EnvMap, this.env2TestSuiteMap);
    };
    /*
      Discovers any test files, parses them, and inserts them into the testSuites/envs that they belong
     */
    BusybeeParsedConfig.prototype.parseTestFiles = function (parsedTestSuites, mode) {
        var _this = this;
        this.logger.debug("parseFiles");
        this.logger.debug(this.env2TestSuiteMap, true);
        this.logger.debug(this.testSet2EnvMap, true);
        var files = glob.sync(this.filePaths.busybeeDir + "/**/*.json", { ignore: "" + this.filePaths.userConfigFile });
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
                // support multiple testSets
                if (!Array.isArray(test.testSet)) {
                    test.testSet = [test.testSet];
                }
                // iterate each testSet entry for this test (1 test can run in multiple testSets)
                test.testSet.forEach(function (testSetInfo) {
                    // lookup the env that this TestSet is a member of
                    if (_.isUndefined(_this.testSet2EnvMap.get(testSetInfo.id))) {
                        _this.logger.warn("Unable to identify the Test Environment containing the testSetId '" + testSetInfo.id + "'.");
                        return;
                    }
                    var testEnvId = _this.testSet2EnvMap.get(testSetInfo.id);
                    // lookup the suite that this env is a member of
                    if (_.isUndefined(_this.env2TestSuiteMap.get(testEnvId))) {
                        _this.logger.warn("Unable to identify the Test Suite containing the envId " + testEnvId + ".");
                        return;
                    }
                    var suiteID = _this.env2TestSuiteMap.get(testEnvId);
                    if (_.isUndefined(testSetInfo.index)) {
                        // push it on the end
                        parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id).tests.push(test);
                        //conf.restApi.testEnvs[testEnvId].testSets[testSetInfo.id].tests.push(test);
                    }
                    else {
                        // insert it at the proper index, fill any empty spots along the way
                        Array(testSetInfo.index + 1).fill(null).forEach(function (d, i) {
                            if (i == testSetInfo.index) {
                                parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id).tests[i] = test;
                            }
                            else {
                                if (!parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id).tests[i]) {
                                    parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id).tests[i] = {};
                                }
                            }
                        });
                    }
                });
            });
        });
        return parsedTestSuites;
    };
    BusybeeParsedConfig.prototype.getLogLevel = function (cmdOpts) {
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
    return BusybeeParsedConfig;
}());
exports.BusybeeParsedConfig = BusybeeParsedConfig;
//# sourceMappingURL=BusybeeParsedConfig.js.map