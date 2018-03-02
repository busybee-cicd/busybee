"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var uuidv1 = require("uuid/v1");
var Logger_1 = require("../../lib/Logger");
var glob = require("glob");
var fs = require("fs");
var _ = require("lodash");
var path = require("path");
var ParsedTestSuiteConfig_1 = require("./parsed/ParsedTestSuiteConfig");
var FilePathsConfig_1 = require("./parsed/FilePathsConfig");
var TypedMap_1 = require("../../lib/TypedMap");
var RESTTest_1 = require("../RESTTest");
var BusybeeParsedConfig = /** @class */ (function () {
    function BusybeeParsedConfig(userConfig, cmdOpts, mode) {
        this.testSet2EnvMap = new TypedMap_1.TypedMap();
        this.env2TestSuiteMap = new TypedMap_1.TypedMap();
        this.testFiles = [];
        this.skipTestSuites = [];
        this.envInstancesToRun = [];
        this.localMode = false;
        this.cmdOpts = Object.assign({}, cmdOpts); // TODO make sure nothing references this directly from this point
        this.logLevel = this.getLogLevel();
        this.logger = new Logger_1.Logger({ logLevel: this.logLevel }, this);
        this.parseCmdOpts(this.cmdOpts);
        this.filePaths = new FilePathsConfig_1.FilePathsConfig(cmdOpts);
        this.onComplete = userConfig.onComplete;
        this.parsedTestSuites = this.parseTestSuites(userConfig, mode);
        this.envResources = userConfig.envResources;
        this.reporters = userConfig.reporters;
        if (this.localMode) {
            this.logger.info("LocalMode detected. Host Configuration will be ignored in favor of 'localhost'");
        }
    }
    BusybeeParsedConfig.prototype.parseCmdOpts = function (cmdOpts) {
        if (cmdOpts.skipTestSuite) {
            this.skipTestSuites = cmdOpts.skipTestSuite.split(',');
        }
        if (cmdOpts.testFiles) {
            this.testFiles = cmdOpts.testFiles.split(',');
        }
        if (cmdOpts.envInstances) {
            this.envInstancesToRun = cmdOpts.envInstances.split(',');
        }
        if (cmdOpts.localMode) {
            this.localMode = cmdOpts.localMode;
        }
    };
    BusybeeParsedConfig.prototype.getEnvInstancesToRun = function () {
        return this.envInstancesToRun;
    };
    BusybeeParsedConfig.prototype.toJSON = function () {
        return {
            parsedTestSuites: this.parsedTestSuites,
            envResources: this.envResources,
            logLevel: this.logLevel
        };
    };
    BusybeeParsedConfig.prototype.getTestSet2EnvMap = function () {
        return this.testSet2EnvMap;
    };
    BusybeeParsedConfig.prototype.getEnv2TestSuiteMap = function () {
        return this.env2TestSuiteMap;
    };
    BusybeeParsedConfig.prototype.parseTestSuites = function (userConf, mode) {
        var _this = this;
        this.logger.trace("parseTestSuites");
        var parsedTestSuites = new TypedMap_1.TypedMap();
        // see if the user specified to skip testSuites
        // TODO: figure out why we can only pass 1 testSuite when in mock mode. in theory we should be able to parse all
        // test suites regardless of mode. However, if we do...for some reason the test suite to be mocked does not include
        // any tests.
        if (mode === 'mock') {
            var testSuite = _.find(userConf.testSuites, function (suite) { return suite.id == _this.cmdOpts.testSuite; });
            var parsedTestSuite = this.parseTestSuite(testSuite, mode);
            parsedTestSuites.set(parsedTestSuite.suiteID, parsedTestSuite);
        }
        else {
            userConf.testSuites.forEach(function (testSuite) {
                var suiteID = testSuite.id || uuidv1();
                _this.logger.trace("suiteID: " + suiteID);
                _this.logger.trace("skipTestSuites: " + JSON.stringify(_this.skipTestSuites));
                if (_.find(_this.skipTestSuites, function (sID) { return sID === suiteID; })) {
                    _this.logger.trace("Skipping testSuite: " + suiteID);
                    return;
                }
                // parse this testSuite
                var parsedTestSuite = _this.parseTestSuite(testSuite, mode);
                parsedTestSuites.set(parsedTestSuite.suiteID, parsedTestSuite);
                _this.logger.trace(parsedTestSuites);
            });
        }
        return this.parseTestFiles(parsedTestSuites, mode);
    };
    BusybeeParsedConfig.prototype.parseTestSuite = function (testSuite, mode) {
        this.logger.trace("parseTestSuite " + testSuite.id + " " + mode);
        // create an id for this testSuite
        return new ParsedTestSuiteConfig_1.ParsedTestSuite(testSuite, mode, this.testSet2EnvMap, this.env2TestSuiteMap);
    };
    /*
      Discovers any test files, parses them, and inserts them into the testSuites/envs that they belong
     */
    BusybeeParsedConfig.prototype.parseTestFiles = function (parsedTestSuites, mode) {
        var _this = this;
        this.logger.trace("parseTestFiles");
        this.logger.trace(this.env2TestSuiteMap, true);
        this.logger.trace(this.testSet2EnvMap, true);
        // build up a list of testFolders
        var testFolders = [];
        parsedTestSuites.values().map(function (pst) {
            if (pst.testFolder) {
                testFolders.push(path.join(_this.filePaths.busybeeDir, pst.testFolder, '/**/*.json'));
                testFolders.push(path.join(_this.filePaths.busybeeDir, pst.testFolder, '/**/*.js'));
            }
        });
        var files = glob.sync("{" + testFolders.join(',') + "}", { ignore: "" + this.filePaths.userConfigFile });
        // parse json files, compile testSets and add them to the conf.
        this.logger.info("parsing files...");
        files.forEach(function (file) {
            // support for running specific tests files
            if (_this.testFiles.length > 0 && !_.find(_this.testFiles, function (fileName) { return file.endsWith(fileName); })) {
                _this.logger.info("skipping " + file);
                return;
            }
            else {
                _this.logger.info("parsing " + file);
            }
            // require all .js and .json files
            var tests;
            if (file.endsWith('.js')) {
                tests = require(file);
            }
            else {
                tests = JSON.parse(fs.readFileSync(file, 'utf8').toString());
            }
            // ensure that all of our testFiles return arrays of tests and not just a single test object
            if (!Array.isArray(tests)) {
                tests = [tests];
                _this.logger.trace("is not array of tests");
            }
            tests.forEach(function (test) {
                _this.logger.trace(test);
                test = new RESTTest_1.RESTTest(test);
                // run through various business logic scenarios to determine if the current test should be parsed
                if (test.skip) {
                    return;
                }
                if (mode === 'test') {
                    if (!test.expect || !test.expect.status || !test.expect.body) {
                        _this.logger.debug("test.expect not defined for " + test.id + ". Skipping");
                        return;
                    }
                }
                if (mode === 'mock') {
                    test.testSet = { id: 'default' };
                    if (!test.expect && !test.mockResponse) {
                        _this.logger.warn("test.expect && test.mockResponse not defined for " + test.id + ". Cannot mock!");
                        return;
                    }
                }
                if (_.isUndefined(test.testSet)) {
                    _this.logger.info("test '" + test.id + "' does not contain required prop 'testSet'. Skipping");
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
                    _this.logger.trace("testSetInfo");
                    _this.logger.trace(testSetInfo, true);
                    var testEnvId = _this.testSet2EnvMap.get(testSetInfo.id);
                    // lookup the suite that this env is a member of
                    if (_.isUndefined(_this.env2TestSuiteMap.get(testEnvId))) {
                        _this.logger.warn("Unable to identify the Test Suite containing the envId " + testEnvId + ".");
                        return;
                    }
                    _this.logger.trace("testEnvId");
                    _this.logger.trace(testEnvId);
                    var suiteID = _this.env2TestSuiteMap.get(testEnvId);
                    if (_.isUndefined(testSetInfo.index)) {
                        // push it on the end
                        parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id).testsUnordered.push(test);
                        // if (testSetInfo.id === 'asset management') {
                        //   this.logger.debug(parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id), true);
                        // }
                    }
                    else {
                        // insert it at the proper index, fill any empty spots along the way
                        var existingTests_1 = parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id).tests;
                        var newArrLength = testSetInfo.index + 1;
                        if (existingTests_1 && existingTests_1.length > newArrLength) {
                            // we need to extend the length of the array to add this at the proper index.
                            newArrLength = existingTests_1.length;
                        }
                        // create an array of nulls of the current known maxLength and fill it back in.
                        Array(newArrLength).fill(null).forEach(function (d, i) {
                            if (i == testSetInfo.index) {
                                parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id).tests[i] = test;
                            }
                            else {
                                if (!existingTests_1[i]) {
                                    parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id).tests[i] = null;
                                }
                            }
                        });
                    }
                    // this.logger.trace(`testSet updated`);
                    // this.logger.trace(parsedTestSuites.get(suiteID).testEnvs.get(testEnvId).testSets.get(testSetInfo.id));
                });
            });
        });
        // zip up any tests/unorderedTests
        parsedTestSuites.forEach(function (pts, ptsId) {
            pts.testEnvs.forEach(function (te, teId) {
                te.testSets.forEach(function (ts, tsId) {
                    ts.tests = ts.tests.concat(ts.testsUnordered);
                });
            });
        });
        return parsedTestSuites;
    };
    BusybeeParsedConfig.prototype.getLogLevel = function () {
        var logLevel;
        if (process.env['BUSYBEE_DEBUG']) {
            logLevel = Logger_1.Logger.DEBUG;
        }
        else if (process.env['BUSYBEE_LOG_LEVEL']) {
            if (Logger_1.Logger.isLogLevel(process.env['BUSYBEE_LOG_LEVEL'])) {
                logLevel = process.env['BUSYBEE_LOG_LEVEL'];
            }
        }
        else if (this.cmdOpts) {
            if (this.cmdOpts.debug) {
                logLevel = Logger_1.Logger.DEBUG;
            }
            else if (this.cmdOpts.logLevel) {
                if (Logger_1.Logger.isLogLevel(this.cmdOpts.logLevel)) {
                    logLevel = this.cmdOpts.logLevel;
                }
            }
        }
        return logLevel;
    };
    return BusybeeParsedConfig;
}());
exports.BusybeeParsedConfig = BusybeeParsedConfig;
//# sourceMappingURL=BusybeeParsedConfig.js.map