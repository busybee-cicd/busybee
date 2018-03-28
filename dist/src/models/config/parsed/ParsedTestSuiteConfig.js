"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ParsedTestEnvConfig_1 = require("./ParsedTestEnvConfig");
var TypedMap_1 = require("../../../lib/TypedMap");
var ParsedTestSetConfig_1 = require("./ParsedTestSetConfig");
var EnvInstanceConfig_1 = require("../user/EnvInstanceConfig");
var TestSetConfig_1 = require("../user/TestSetConfig");
var Logger_1 = require("../../../lib/Logger");
var _ = require("lodash");
var ParsedTestSuite = /** @class */ (function () {
    function ParsedTestSuite(suite, mode, testSet2EnvMap, env2TestSuiteMap) {
        this.logger = new Logger_1.Logger({ logLevel: process.env['BUSYBEE_LOG_LEVEL'] }, this);
        this.defaultRequestOpts = suite.defaultRequestOpts;
        this.env = suite.env;
        this.mockServer = suite.mockServer;
        this.ports = suite.ports;
        this.protocol = suite.protocol;
        this.host = suite.host;
        this.suiteID = suite.id;
        this.skip = suite.skip;
        this.type = suite.type || 'REST';
        this.root = suite.root;
        this.testFolder = suite.testFolder;
        this.testEnvs = new TypedMap_1.TypedMap();
        this.parseSuite(suite, mode, testSet2EnvMap, env2TestSuiteMap);
    }
    ParsedTestSuite.prototype.parseSuite = function (testSuite, mode, testSet2EnvMap, env2TestSuiteMap) {
        var _this = this;
        // assign a default env to this TestSuite IF this is a REST TestSuite to cover cases
        // where the user doesn't specify a testEnv
        if (!testSuite.type || (testSuite.type && testSuite.type.toUpperCase() === 'REST')) {
            var defaultParsedTestEnv = new ParsedTestEnvConfig_1.ParsedTestEnvConfig();
            var tsc = new TestSetConfig_1.TestSetConfig();
            tsc.id = 'default';
            var defaultParsedTestSet = new ParsedTestSetConfig_1.ParsedTestSetConfig(tsc);
            defaultParsedTestSet.id = 'default';
            defaultParsedTestEnv.testSets.set('default', defaultParsedTestSet);
            var defaultEnvInstance = new EnvInstanceConfig_1.EnvInstanceConfig();
            defaultEnvInstance.testSets = [];
            defaultEnvInstance.id = 'default';
            var defaultTestSet = new TestSetConfig_1.TestSetConfig();
            defaultTestSet.id = 'default';
            defaultEnvInstance.testSets.push(defaultTestSet);
            if (!testSuite.envInstances) {
                testSuite.envInstances = [];
            }
            testSuite.envInstances.push(defaultEnvInstance);
            this.testEnvs.set('default', defaultParsedTestEnv);
        }
        // iterate each user userConfigFile env defined for this testSuite.
        testSuite.envInstances.forEach(function (testEnvConf) {
            // rename the env's id to suiteEnvID for clarity later 'id' gets thrown around a lot.
            // testEnvConf.suiteEnvID = testEnvConf.id;
            // delete testEnvConf.id;
            // add this env to the env2TestSuiteMap
            _this.logger.trace('testEnvConf');
            _this.logger.trace(JSON.stringify(testEnvConf));
            var parsedTestEnvConfig = new ParsedTestEnvConfig_1.ParsedTestEnvConfig();
            parsedTestEnvConfig.suiteEnvID = testEnvConf.id;
            env2TestSuiteMap.set(parsedTestEnvConfig.suiteEnvID, _this.suiteID);
            if (testEnvConf.testSets) {
                testEnvConf.testSets.forEach(function (testSetConf) {
                    var parsedTestSetConfig = new ParsedTestSetConfig_1.ParsedTestSetConfig(testSetConf);
                    _this.logger.trace("testSetConf " + testSetConf.id);
                    _this.logger.trace("parsedTestSetConfig " + parsedTestSetConfig.id);
                    // if this testSet already exists skip it
                    if (parsedTestEnvConfig.testSets.get(parsedTestSetConfig.id)) {
                        _this.logger.info("Test set " + testSetConf.id + " already exists. Skipping");
                        return;
                    }
                    // add the set to the parsedTestEnvConfig
                    parsedTestEnvConfig.testSets.set(testSetConf.id, parsedTestSetConfig);
                    // store env lookup for later
                    if (_.isEmpty(testSet2EnvMap.get(parsedTestSetConfig.id))) {
                        testSet2EnvMap.set(parsedTestSetConfig.id, new Array());
                    }
                    testSet2EnvMap.get(parsedTestSetConfig.id).push(parsedTestEnvConfig.suiteEnvID);
                });
            }
            _this.testEnvs.set(parsedTestEnvConfig.suiteEnvID, parsedTestEnvConfig);
        });
        this.logger.trace(('done parsing suite'));
    };
    return ParsedTestSuite;
}());
exports.ParsedTestSuite = ParsedTestSuite;
//# sourceMappingURL=ParsedTestSuiteConfig.js.map