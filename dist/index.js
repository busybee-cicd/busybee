#!/usr/bin/env node
"use strict";
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
require('source-map-support').install();
var _async = require("async");
var _ = require("lodash");
var Commander = require("commander");
var fs = require("fs");
var path = require("path");
var ConfigParser_1 = require("./lib/ConfigParser");
var EnvManager_1 = require("./lib/EnvManager");
var TestManager_1 = require("./lib/TestManager");
var MockServer_1 = require("./lib/MockServer");
var Logger_1 = require("./lib/Logger");
var logger;
Commander
    .version('0.1.0');
// TODO: REMOVE protocol and host from cmdOpts...need to be per test suite
Commander
    .command('test')
    .description('execute tests')
    .option('-c, --userConfigFile <userConfigFile>', 'Config File. defaults to userConfigFile.json. parsed as being relative to --directory')
    .option('-d, --directory <directory>', 'Test Directory. defaults to busybee/')
    .option('-D, --debug', 'convenience flag for debug mode')
    .option('-l, --localMode', 'ignores any host configuration in favor of localhost with a capacity of 100')
    .option('-L, --logLevel <level>', '[DEBUG, INFO, WARN, ERROR]')
    .option('-o, --onComplete <onComplete>', 'The filename of javascript module placed in your busybee/ directory. Will be called on complete. ex module) module.exports = (err, results) => { console.log(err || JSON.stringify(results)); }')
    .option('-s, --skipEnvProvisioning <ids>', 'list of comma-separated TestSuite ids. Environments will not be provisioned for these TestSuites prior to running tests')
    .option('-sts, --skipTestSuite <ids>', 'list of comma-separated TestSuite ids to skip')
    .action(function (options) {
    var configParser = new ConfigParser_1.ConfigParser(options);
    var conf = configParser.parse('test');
    logger = new Logger_1.Logger(conf, _this);
    initTests(conf);
});
Commander
    .command('mock')
    .description('runs a mock REST API server using your tests as mocks')
    .option('-c, --userConfigFile <userConfigFile>', 'Config File. defaults to userConfigFile.json. parsed as being relative to --directory')
    .option('-d, --directory <directory>', 'Test Directory. defaults to busybee/')
    .option('-D, --debug', 'convenience flag for debug mode')
    .option('-L, --logLevel <level>', '[DEBUG, INFO, WARN, ERROR]')
    .option('-np, --noProxy, Will ignore any userConfigFile.json proxy configuration and skip proxy attempts')
    .option('-t, --testSuite <id>', 'Required. The ID of the REST Api TestSuite that you would like to run a mock server for')
    .action(function (options) {
    if (!options.testSuite) {
        console.log("'--testSuite' is a required argument, exiting");
        return;
    }
    var configParser = new ConfigParser_1.ConfigParser(options);
    var conf = configParser.parse('mock');
    logger = new Logger_1.Logger(conf, _this);
    // identify the TestSuite.
    var testSuite = _.find(conf.parsedTestSuites.values(), function (suite) { return suite.suiteID == options.testSuite; });
    if (!testSuite) {
        logger.error("No TestSuite with the id " + options.testSuite + " could be identified, exiting");
        return;
    }
    testSuite.cmdOpts = options;
    new MockServer_1.MockServer(testSuite, conf);
});
Commander
    .command('init')
    .description('set up busybee folder and example userConfigFile/test')
    .action(function () {
    var exampleConf = require('./init/userConfigFile.json');
    var exampleTest = require('./init/test.json');
    var busybeeDir = path.join(process.cwd(), 'busybee');
    if (!fs.existsSync(busybeeDir))
        fs.mkdirSync(busybeeDir);
    if (!fs.exists(path.join(busybeeDir, 'test.json'), null))
        fs.writeFileSync(path.join(busybeeDir, 'test.json'), JSON.stringify(exampleTest, null, '\t'));
    if (!fs.exists(path.join(busybeeDir, 'userConfigFile.json'), null))
        fs.writeFileSync(path.join(busybeeDir, 'userConfigFile.json'), JSON.stringify(exampleConf, null, '\t'));
    console.log("Busybee initialized!");
});
Commander.parse(process.argv);
function initTests(conf) {
    // 2. instantiate EnvManager and ApiManager. handle shutdown signals
    var envManager = new EnvManager_1.EnvManager(conf);
    var testManager = new TestManager_1.TestManager(conf, envManager);
    function shutdown(err) {
        if (err)
            console.log(err);
        envManager.stopAll(null)
            .then(function () {
            process.exit(0);
        })
            .catch(function (err) {
            console.log(err);
            process.exit(1);
        });
    }
    process.on('uncaughtException', function (err) {
        shutdown(err);
    });
    process.on('SIGHUP', function () {
        shutdown(null);
    });
    process.on('SIGINT', function () {
        shutdown(null);
    });
    testManager.buildTestSuiteTasks();
    // run the api tests
    // TODO: allow ordering of TestSuites and TestEnvs
    var envTasks = [];
    _.forEach(testManager.testSuiteTasks, function (suiteTask) {
        suiteTask.envTasks.forEach(function (envTask) {
            envTasks.push(envTask);
        });
    });
    _async.parallel(envTasks, function (err, results) {
        if (conf.onComplete || conf.cmdOpts.onComplete) {
            var scriptPath = conf.onComplete ?
                path.join(conf.filePaths.busybeeDir, conf.onComplete)
                : path.join(conf.filePaths.busybeeDir, conf.cmdOpts.onComplete);
            try {
                logger.debug("Running onComplete: " + scriptPath);
                require(scriptPath)(err, results);
            }
            catch (e) {
                console.log(e);
            }
        }
        else {
            console.log(err || JSON.stringify(results, null, '\t'));
        }
    });
    // run the ui tests
}
//# sourceMappingURL=index.js.map