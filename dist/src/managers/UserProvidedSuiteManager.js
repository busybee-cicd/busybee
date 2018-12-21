'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : new P(function(resolve) {
              resolve(result.value);
            }).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function(thisArg, body) {
    var _ = {
        label: 0,
        sent: function() {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: []
      },
      f,
      y,
      t,
      g;
    return (
      (g = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function() {
          return this;
        }),
      g
    );
    function verb(n) {
      return function(v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while (_)
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y['return']
                  : op[0]
                  ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                  : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, '__esModule', { value: true });
var _ = require('lodash');
var path = require('path');
var busybee_util_1 = require('busybee-util');
var TestSetResult_1 = require('../models/results/TestSetResult');
var UserProvidedSuiteManager = /** @class */ (function() {
  function UserProvidedSuiteManager(conf, suiteEnvConf, envManager) {
    this.conf = _.cloneDeep(conf);
    this.suiteEnvConf = suiteEnvConf;
    this.envManager = envManager;
    var loggerConf = new busybee_util_1.LoggerConf(this, conf.logLevel, null);
    this.logger = new busybee_util_1.Logger(loggerConf);
  }
  UserProvidedSuiteManager.prototype.buildUrl = function(port) {
    this.logger.trace('buildUrl ' + port);
    var protocol = this.suiteEnvConf.protocol;
    var hostName = this.suiteEnvConf.hostName;
    var url = protocol + '://' + hostName;
    if (port) {
      url += ':' + port;
    }
    return url;
  };
  UserProvidedSuiteManager.prototype.runTestSets = function(generatedEnvID) {
    return __awaiter(this, void 0, void 0, function() {
      var testSetPromises, e_1;
      var _this = this;
      return __generator(this, function(_a) {
        switch (_a.label) {
          case 0:
            this.logger.trace(
              'runTestSets ' +
                this.suiteEnvConf.suiteID +
                ' ' +
                this.suiteEnvConf.suiteEnvID
            );
            this.logger.trace(this.suiteEnvConf, true);
            testSetPromises = this.suiteEnvConf.testSets
              .values()
              .map(function(testSet) {
                return _this.runTestSet(testSet, generatedEnvID);
              });
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            return [4 /*yield*/, Promise.all(testSetPromises)];
          case 2:
            return [2 /*return*/, _a.sent()];
          case 3:
            e_1 = _a.sent();
            this.logger.trace(
              'runTestSets ERROR encountered while running testSetPromises'
            );
            throw e_1;
          case 4:
            return [2 /*return*/];
        }
      });
    });
  };
  UserProvidedSuiteManager.prototype.runTestSet = function(
    testSet,
    generatedEnvID
  ) {
    return __awaiter(this, void 0, void 0, function() {
      var testSetResult,
        busybeeDir,
        scriptPath,
        args,
        returnData,
        assertionResult,
        e_2;
      return __generator(this, function(_a) {
        switch (_a.label) {
          case 0:
            this.logger.trace(
              'runTestSet | ' +
                this.suiteEnvConf.suiteID +
                ' | ' +
                this.suiteEnvConf.suiteEnvID +
                ' | ' +
                testSet.id
            );
            this.logger.trace(testSet, true);
            testSetResult = new TestSetResult_1.TestSetResult();
            testSetResult.id = testSet.id;
            testSetResult.pass = true;
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            busybeeDir = this.conf.filePaths.busybeeDir;
            scriptPath = path.join(busybeeDir, this.suiteEnvConf.runScript);
            args = {
              generatedEnvID: generatedEnvID,
              protocol: this.suiteEnvConf.protocol,
              hostName: this.suiteEnvConf.hostName,
              ports: this.suiteEnvConf.ports,
              busybeeDir: busybeeDir,
              runData: testSet.runData
            };
            return [
              4 /*yield*/,
              this.envManager.runScript(scriptPath, [JSON.stringify(args)])
            ];
          case 2:
            returnData = _a.sent();
            if (testSet.assertion) {
              try {
                assertionResult = testSet.assertion(returnData);
                if (assertionResult === false) {
                  testSetResult.pass = false;
                }
              } catch (e) {
                testSetResult.pass = false;
                testSetResult.error = e;
              }
            }
            return [3 /*break*/, 4];
          case 3:
            e_2 = _a.sent();
            testSetResult.pass = false;
            testSetResult.error = e_2;
            return [3 /*break*/, 4];
          case 4:
            return [2 /*return*/, testSetResult];
        }
      });
    });
  };
  return UserProvidedSuiteManager;
})();
exports.UserProvidedSuiteManager = UserProvidedSuiteManager;
//# sourceMappingURL=UserProvidedSuiteManager.js.map
