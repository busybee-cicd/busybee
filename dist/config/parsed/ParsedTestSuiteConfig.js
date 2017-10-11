"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ParsedTestEnvConfig_1 = require("./ParsedTestEnvConfig");
var TypedMap_1 = require("../../lib/TypedMap");
var ParsedTestSetConfig_1 = require("./ParsedTestSetConfig");
var EnvInstanceConfig_1 = require("../user/EnvInstanceConfig");
var TestSetConfig_1 = require("../user/TestSetConfig");
var Logger_1 = require("../../lib/Logger");
var ParsedTestSuite = /** @class */ (function () {
    function ParsedTestSuite(suite, mode, testSet2EnvMap, env2TestSuiteMap) {
        this.logger = new Logger_1.Logger({ logLevel: process.env.BUSYBEE_LOG_LEVEL }, this);
        this.defaultRequestOpts = suite.defaultRequestOpts;
        this.env = suite.env;
        this.mockServer = suite.mockServer;
        this.ports = suite.ports;
        this.protocol = suite.protocol;
        this.host = suite.host;
        this.suiteID = suite.id;
        this.skip = suite.skip;
        this.type = suite.type;
        this.root = suite.root;
        this.testEnvs = new TypedMap_1.TypedMap();
        this.parseSuite(suite, mode, testSet2EnvMap, env2TestSuiteMap);
    }
    ParsedTestSuite.prototype.parseSuite = function (testSuite, mode, testSet2EnvMap, env2TestSuiteMap) {
        var _this = this;
        // assign a default env to this TestSuite incase they add tests that don't specify an Env to run in
        var defaultParsedTestEnv = new ParsedTestEnvConfig_1.ParsedTestEnvConfig();
        var defaultParsedTestSet = new ParsedTestSetConfig_1.ParsedTestSetConfig();
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
        // iterate each user userConfigFile env defined for this testSuite.
        testSuite.envInstances.forEach(function (testEnvConf) {
            // rename the env's id to suiteEnvID for clarity later 'id' gets thrown around a lot.
            // testEnvConf.suiteEnvID = testEnvConf.id;
            // delete testEnvConf.id;
            // add this env to the env2TestSuiteMap
            _this.logger.debug('testEnvConf');
            _this.logger.debug(JSON.stringify(testEnvConf));
            var parsedTestEnvConfig = new ParsedTestEnvConfig_1.ParsedTestEnvConfig();
            parsedTestEnvConfig.suiteEnvID = testEnvConf.id;
            env2TestSuiteMap.set(parsedTestEnvConfig.suiteEnvID, _this.suiteID);
            if (testEnvConf.testSets) {
                testEnvConf.testSets.forEach(function (testSetConf) {
                    var parsedTestSetConfig = new ParsedTestSetConfig_1.ParsedTestSetConfig();
                    // testSetStubs is a placeholder object to ensure that there is a 'tests'
                    // array ready to accept tests during the test parsing step
                    if (parsedTestEnvConfig.testSets.get(testSetConf.id)) {
                        _this.logger.info("Test set " + testSetConf.id + " already exists. Skipping");
                        return;
                    }
                    parsedTestSetConfig.id = testSetConf.id;
                    parsedTestEnvConfig.testSets.set(testSetConf.id, parsedTestSetConfig);
                    // store env lookup for later
                    testSet2EnvMap.set(parsedTestSetConfig.id, parsedTestEnvConfig.suiteEnvID);
                });
            }
            _this.testEnvs.set(parsedTestEnvConfig.suiteEnvID, parsedTestEnvConfig);
        });
        this.logger.debug(('done parsing suite'));
    };
    return ParsedTestSuite;
}());
exports.ParsedTestSuite = ParsedTestSuite;
//# sourceMappingURL=ParsedTestSuiteConfig.js.map