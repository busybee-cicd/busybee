#!/usr/bin/env node
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
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
require('source-map-support').install();
var _async = require("async");
var _ = require("lodash");
var Commander = require("commander");
var fs = require("fs");
var path = require("path");
var ConfigParser_1 = require("./lib/ConfigParser");
var EnvManager_1 = require("./managers/EnvManager");
var TestManager_1 = require("./managers/TestManager");
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
    .option('-k, --skipTestSuite <ids>', 'list of comma-separated TestSuite ids to skip')
    .option('-t, --testFiles <filenames>', 'list of comma-separated test files to run. ie) test.json,test2.json,users/mytest.json')
    .option('-e, --envInstances <ids>', 'list of comma-separated envInstance ids to run')
    .action(function (options) {
    var configParser = new ConfigParser_1.ConfigParser(options);
    var conf = configParser.parse('test');
    logger = new Logger_1.Logger(conf, _this);
    initTests(conf);
});
Commander
    .command('mock')
    .description('runs a mockResponse REST API server using your tests as mocks')
    .option('-c, --userConfigFile <userConfigFile>', 'Config File. defaults to userConfigFile.json. parsed as being relative to --directory')
    .option('-d, --directory <directory>', 'Test Directory. defaults to busybee/')
    .option('-D, --debug', 'convenience flag for debug mode')
    .option('-L, --logLevel <level>', '[DEBUG, INFO, WARN, ERROR]')
    .option('-n, --noProxy, Will ignore any userConfigFile.json proxy configuration and skip proxy attempts')
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
    var testSuite = _.find(conf.parsedTestSuites.values(), function (suite) {
        return suite.suiteID == options.testSuite;
    });
    if (!testSuite) {
        logger.error("No TestSuite with the id " + options.testSuite + " could be identified, exiting");
        return;
    }
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
        return __awaiter(this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (err)
                            console.log(err);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, envManager.stopAll()];
                    case 2:
                        _a.sent();
                        process.exit(0);
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        console.log(err);
                        process.exit(1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
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
    _async.parallel(envTasks, function (err, envResults) {
        // group the result sets by their Suite
        var suiteResults = {};
        envResults.forEach(function (envResult) {
            if (!suiteResults[envResult.suiteID]) {
                suiteResults[envResult.suiteID] = {
                    testSets: envResult.testSets,
                    pass: true,
                    type: envResult.type
                };
            }
            else {
                suiteResults[envResult.suiteID].testSets = suiteResults[envResult.suiteID].testSets.concat(envResult.testSets);
            }
            // mark the suite as failed if it contains atleast 1 env w/ a failure
            if (_.find(envResult.testSets, function (ts) { return !ts.pass; })) {
                suiteResults[envResult.suiteID].pass = false;
            }
            ;
        });
        // for easier parsing lets return each suite as its own object in a list
        var suiteResultsList = [];
        _.forEach(suiteResults, function (v, suiteID) {
            var sr = Object.assign({}, { id: suiteID }, v);
            suiteResultsList.push(sr);
        });
        if (conf.reporters && !_.isEmpty(conf.reporters)) {
            conf.reporters.forEach(function (r) {
                try {
                    r.run(suiteResultsList);
                }
                catch (e) {
                    logger.error('Error encountered while running reporter');
                    logger.error(e);
                }
            });
        }
        if (conf.onComplete || conf.cmdOpts.onComplete) {
            var scriptPath = conf.onComplete ?
                path.join(conf.filePaths.busybeeDir, conf.onComplete)
                : path.join(conf.filePaths.busybeeDir, conf.cmdOpts.onComplete);
            try {
                logger.debug("Running onComplete: " + scriptPath);
                require(scriptPath)(err, suiteResultsList);
            }
            catch (e) {
                console.log(e);
            }
        }
        else {
            logger.debug(err || suiteResultsList);
            logger.info(suiteResultsList);
            logger.info('Complete');
        }
    });
    // run the ui tests
}
//# sourceMappingURL=index.js.map