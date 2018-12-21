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
var express = require('express');
var server = express();
var bodyParser = require('body-parser');
var _ = require('lodash');
var hash = require('object-hash');
var httpProxy = require('http-proxy');
var restream = require('./restream');
var qs = require('querystring');
var busybee_util_1 = require('busybee-util');
var MockServer = /** @class */ (function() {
  function MockServer(testSuiteConf, conf) {
    this.conf = conf;
    this.testSuiteConf = testSuiteConf;
    var loggerConf = new busybee_util_1.LoggerConf(this, conf.logLevel, null);
    this.logger = new busybee_util_1.Logger(loggerConf);
    this.logger.info('Initializing Mock Server');
    this.routeMap = {}; // store the routes and all of the known request combos for each route
    var serverConf = this.testSuiteConf.mockServer;
    if (serverConf && serverConf.proxy && !conf.noProxy) {
      this.logger.info('Proxy config detected');
      if (
        !serverConf.proxy.protocol ||
        !serverConf.proxy.host ||
        !serverConf.proxy.port
      ) {
        this.logger.warn(
          "WARNING: mockServer proxy configuration does not contain required properties 'protocol', 'host' and 'port' \n Requests will not be proxied"
        );
      } else {
        var proto = serverConf.proxy.protocol;
        var host = serverConf.proxy.host;
        var port = serverConf.proxy.port;
        this.logger.info(
          'Creating proxy: ' + proto + '://' + host + ':' + port
        );
        this.proxy = new httpProxy.createProxyServer({
          target: {
            host: serverConf.proxy.host,
            port: serverConf.proxy.port
          }
        });
      }
    }
    this.init();
  }
  MockServer.prototype.init = function() {
    var _this = this;
    server.set('etag', false);
    server.use(bodyParser.json()); // for parsing application/json
    server.use(restream(null));
    server.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
    if (this.corsActive()) {
      server.use(function(req, res, next) {
        res.append('Access-Control-Allow-Origin', req.header('origin'));
        res.append('Access-Control-Allow-Credentials', 'true');
        next();
      });
    }
    this.buildRoutes();
    var port = this.getServerPort();
    server.listen(port, function() {
      _this.logger.info('Mock Server listening on ' + port);
    });
  };
  MockServer.prototype.getServerPort = function() {
    var conf = this.testSuiteConf;
    var port = conf.ports[0];
    if (conf.mockServer && conf.mockServer.port) {
      port = conf.mockServer.port;
    }
    return port;
  };
  MockServer.prototype.corsActive = function() {
    return this.testSuiteConf.mockServer.cors !== false;
  };
  MockServer.prototype.buildRoutes = function() {
    var _this = this;
    // setup cors by default
    if (this.corsActive()) {
      this.logger.debug('CORS active');
      server.options('*', function(req, res, next) {
        var headers = {
          'busybee-mock': true,
          'Access-Control-Allow-Methods': 'GET,POST,DELETE,PUT,OPTIONS',
          'Access-Control-Allow-Headers': req.header(
            'Access-Control-Request-Headers'
          ),
          'Access-Control-Max-Age': 86400
        };
        _.forEach(headers, function(v, k) {
          res.append(k, v);
        });
        return res.status(200).end();
      });
    }
    // build the routeMap
    this.logger.trace('testSuiteConf');
    this.logger.trace(this.testSuiteConf.testEnvs, true);
    this.testSuiteConf.testEnvs.forEach(function(testEnv, envId) {
      testEnv.testSets.forEach(function(testSet, testSetName) {
        testSet.tests.forEach(function(test) {
          var pass = false;
          if (
            test.expect &&
            test.expect.status &&
            !_.isFunction(test.expect.body)
          ) {
            pass = true;
          } else if (test.mocks) {
            pass = _.every(test.mocks, function(m) {
              return m.response && m.response.status;
            });
          }
          if (pass) {
            _this.updateRouteMap(test);
          }
        });
      });
    });
    // iterate the routeMap and register each route to the server
    _.each(this.routeMap, function(reqMethodMap, path) {
      _this.addRoute(path, reqMethodMap);
    });
    // add a special catchall route for the proxy if necessary
    if (this.proxy) {
      server.all('*', function(req, res, next) {
        _this.logger.info('No Mock found, proxying request');
        _this.logger.info(req.method + ' ' + req.originalUrl);
        // if a call makes it here then it just needs to be proxied
        req = _this.injectRequestOpts(req);
        _this.proxy.web(req, res);
      });
    }
  };
  // build an path that accounts for the root context
  MockServer.prototype.getEndpoint = function(mock) {
    this.logger.trace('getEndpoint');
    this.logger.trace(mock, true);
    var path = mock.request.path;
    if (!_.isUndefined(mock.request.root)) {
      if (mock.request.root) {
        // allow users to set request.root to override mockServer.root && testSuiteConf.root when mocking
        path = '' + mock.request.root + path;
      } // else they passed null or false and we should not prepend a root (effectively overwriting mockServer.root or testSuiteConf.root
    } else if (!_.isUndefined(this.testSuiteConf.mockServer.root)) {
      if (this.testSuiteConf.mockServer.root != null) {
        // allow users to set mockServer.root to false to override testSuiteConf.root when mocking
        path = '' + this.testSuiteConf.mockServer.root + path;
      }
    } else if (this.testSuiteConf.root) {
      path = '' + this.testSuiteConf.root + path;
    }
    this.logger.trace(path);
    return path;
  };
  MockServer.prototype.updateRouteMap = function(mock) {
    // // update the mockResponse with the globally applied headers according to the conf. (if any)
    // if (this.testSuiteConf.mockServer.injectedRequestOpts) {
    //   delete this.testSuiteConf.mockServer.injectedRequestOpts['description'];
    //   mockResponse.request = Object.assign({}, this.testSuiteConf.mockServer.injectedRequestOpts, mockResponse.request);
    // }
    // build an path that accounts for the root context
    var path = this.getEndpoint(mock);
    if (!this.routeMap[path]) {
      this.routeMap[path] = {
        get: { 200: [] },
        post: { 200: [] },
        put: { 200: [] },
        delete: { 200: [] },
        head: { 200: [] },
        options: { 200: [] }
      };
    }
    // 1. see if this req has already been recorded (could be in multiple sets)
    var request = mock.request;
    var requestOpts = this.buildReqOpts(request);
    // query params come into the controller as strings ALWAYS. so make sure our mockResponse query params are string
    if (requestOpts.query) {
      requestOpts.query = this.convertObjValuesToStrings(requestOpts.query);
    }
    var hashedReq = hash(requestOpts);
    // 1a. search the this.routeMap[test.request.path] for it using the hash
    var method = request.method.toLocaleLowerCase();
    var resStatus; // default to mockResponse
    if (!_.isEmpty(mock.mocks)) {
      resStatus = mock.mocks[0].response.status;
    } else {
      resStatus = mock.expect.status;
    }
    if (this.routeMap[path][method]) {
      if (this.routeMap[path][method][resStatus]) {
        if (
          _.find(this.routeMap[path][method], function(reqInfo) {
            return reqInfo.hash === hashedReq;
          })
        ) {
          // skip this one it exists
          return;
        }
      } else {
        this.routeMap[path][method][resStatus] = [];
      }
    } else {
      this.logger.info(
        'The method ' + method + ' is not currently support for mocks'
      );
      return;
    }
    // 2. register the request info for this route
    this.routeMap[path][method][resStatus].push(
      Object.assign({}, mock, { hash: hashedReq }, { matcherOpts: requestOpts })
    );
  };
  MockServer.prototype.addRoute = function(path, reqMethodMap) {
    var _this = this;
    this.logger.debug('addRoute ' + path + ', ' + JSON.stringify(reqMethodMap));
    _.forEach(reqMethodMap, function(statusMap, methodName) {
      // 1. build a controller
      var ctrl = function(req, res) {
        return __awaiter(_this, void 0, void 0, function() {
          var requestedStatus,
            mocks,
            reqOpts,
            hashedReq,
            matchingMocks,
            mocksWithoutHeaders,
            mocksWithHeaders,
            mockToReturn,
            message,
            message,
            resHeaders,
            mockResponse,
            mockData,
            bodyToReturn;
          var _this = this;
          return __generator(this, function(_a) {
            switch (_a.label) {
              case 0:
                this.logger.trace(req.path);
                requestedStatus = 200;
                if (req.header('busybee-mock-status')) {
                  requestedStatus = parseInt(req.header('busybee-mock-status'));
                  if (!_.isInteger(requestedStatus)) {
                    return [
                      2 /*return*/,
                      res
                        .status(404)
                        .send(
                          "busybee-mock-status must be an Integer, was '" +
                            req.header('busybee-mock-status') +
                            "'"
                        )
                    ];
                  }
                }
                mocks = statusMap[requestedStatus];
                reqOpts = this.buildReqOpts(req);
                this.logger.trace('INCOMING REQ OPTS');
                this.logger.trace(reqOpts, true);
                hashedReq = hash(reqOpts);
                matchingMocks = _.filter(mocks, function(m) {
                  _this.logger.trace('TESTING AGAINST');
                  _this.logger.trace(m.matcherOpts, true);
                  _this.logger.trace(m.hash + ' == ' + hashedReq);
                  return m.hash === hashedReq;
                });
                if (!matchingMocks || matchingMocks.length === 0) {
                  if (this.proxy) {
                    this.proxy.web(req, res);
                  } else {
                    res.status(404).end();
                  }
                  return [2 /*return*/];
                }
                mocksWithoutHeaders = [];
                mocksWithHeaders = new Array();
                matchingMocks.forEach(function(m) {
                  _this.logger.trace('checking mock');
                  // mocks that don't have headers defined don't need to match. IF this array only has 1 item
                  // and we don't have any addition matchingMocks with header needs, it will get returned as a default.
                  if (!m.request.headers) {
                    // mockResponse doesn't require any headers, it passes
                    _this.logger.trace("mock doesn't require any headers");
                    return mocksWithoutHeaders.push(m);
                  }
                  // inject any request opts
                  req = _this.injectRequestOpts(req);
                  var reqHeaders = req.headers;
                  // to remove comparison errors, convert numbers to strings in both header objs
                  reqHeaders = _this.convertObjValuesToStrings(reqHeaders); // convert any numbers to strings
                  var mockHeaders = _this.convertObjValuesToStrings(
                    m.request.headers
                  ); // convert any numbers to strings
                  _this.logger.trace('mockHeaders');
                  _this.logger.trace(mockHeaders, true);
                  var headersPass = true;
                  _.forEach(mockHeaders, function(value, headerName) {
                    if (value == null) {
                      // if the header is null then that implies that we don't want to check for this header
                      _this.logger.trace(
                        'mock headerName ' +
                          headerName +
                          ' set to null, skipping match attempt'
                      );
                      return;
                    }
                    if (reqHeaders[headerName] !== value) {
                      _this.logger.trace(
                        headerName +
                          ' - ' +
                          reqHeaders[headerName] +
                          ' !== ' +
                          value
                      );
                      headersPass = false;
                    }
                  });
                  if (headersPass) {
                    _this.logger.trace('Mock Passes - ' + m.id);
                    mocksWithHeaders.push(m);
                  }
                });
                this.logger.trace('mocksWithoutHeaders');
                this.logger.trace(mocksWithoutHeaders, true);
                this.logger.trace('mocksWithHeaders');
                this.logger.trace(mocksWithHeaders, true);
                if (mocksWithHeaders.length == 1) {
                  // mocksWithHeaders matched more deeply with the request (query+body+headers)
                  // we should prioritize these if we have an exact match
                  mockToReturn = mocksWithHeaders[0];
                } else if (mocksWithoutHeaders.length == 1) {
                  // see if we have a single mockResponse without headers
                  mockToReturn = mocksWithoutHeaders[0];
                } else {
                  if (this.proxy) {
                    this.logger.info(
                      'No mock matches request but proxy available. Proxying request'
                    );
                    return [2 /*return*/, this.proxy.web(req, res)];
                  } else {
                    if (
                      mocksWithoutHeaders.length == 0 &&
                      mocksWithHeaders.length == 0
                    ) {
                      message =
                        'This request did not match any mocks and no proxy is available.';
                      return [
                        2 /*return*/,
                        res.status(404).json({ err: message })
                      ];
                    } else {
                      message =
                        'This request is ambiguous due to multiple mocks sharing the name header requirements.';
                      return [
                        2 /*return*/,
                        res.status(404).json({
                          err: message,
                          mocksInQuestion: mocksWithoutHeaders.concat(
                            mocksWithHeaders
                          )
                        })
                      ];
                    }
                  }
                }
                // set headers
                res.append('busybee-mock', true);
                if (!_.isEmpty(mockToReturn.mocks)) {
                  // in instances where more than 1 mock is provided
                  // the user is signalling that they'd like to change the behavior for
                  // subsequent requests. therefore we shift() this mockData and pop it to the back
                  // for the next request
                  mockData = mockToReturn.mocks.shift();
                  mockResponse = mockData.response;
                  mockToReturn.mocks.push(_.cloneDeep(mockData));
                } else {
                  mockResponse = mockToReturn.expect;
                }
                if (mockResponse) {
                  resHeaders = Object.assign({}, resHeaders, mockResponse);
                }
                if (mockResponse) {
                  _.forEach(resHeaders, function(v, k) {
                    if (v == null) {
                      return;
                    }
                    res.append(k, v);
                  });
                }
                if (!(mockData && mockData.lag)) return [3 /*break*/, 2];
                this.logger.info(
                  'lagging response for ' + mockData.lag + ' milliseconds'
                );
                return [4 /*yield*/, this.sleep(mockData.lag)];
              case 1:
                _a.sent();
                _a.label = 2;
              case 2:
                bodyToReturn = mockResponse.body;
                return [
                  2 /*return*/,
                  res.status(mockResponse.status).json(bodyToReturn)
                ];
            }
          });
        });
      }; // end ctrl
      // 2. register the route/method and ctrl
      _this.logger.info('Registering path ' + path + ' : ' + methodName);
      server[methodName](path, ctrl);
    });
  };
  MockServer.prototype.buildReqOpts = function(req) {
    var opts = {};
    if (!_.isEmpty(req.query)) {
      opts.query = req.query;
    }
    if (!_.isEmpty(req.body)) {
      opts.body = req.body;
    }
    return opts;
  };
  MockServer.prototype.convertObjValuesToStrings = function(obj) {
    var _this = this;
    var newObj = {};
    _.forEach(obj, function(value, key) {
      if (_.isObject(value)) {
        newObj[key] = _this.convertObjValuesToStrings(value);
      } else {
        if (!_.isNil(value)) {
          newObj[key] = value.toString();
          if (newObj[key]) {
            newObj[key] = qs.unescape(newObj[key]);
          }
        } else {
          newObj[key] = value;
        }
      }
    });
    return newObj;
  };
  MockServer.prototype.injectRequestOpts = function(req) {
    var _this = this;
    var mockServerConf = this.testSuiteConf.mockServer;
    if (mockServerConf.injectedRequestOpts) {
      ['headers', 'query', 'body'].forEach(function(target) {
        if (mockServerConf.injectedRequestOpts[target]) {
          _this.logger.trace(
            'injectedRequestOpts.' + target + ' detected. Injecting ' + target
          );
          req[target] = Object.assign(
            {},
            mockServerConf.injectedRequestOpts[target],
            req[target]
          );
          _this.logger.trace(target + ' injected');
          _this.logger.trace(req[target], true);
        }
      });
    }
    return req;
  };
  MockServer.prototype.sleep = function(ms) {
    return new Promise(function(resolve) {
      return setTimeout(resolve, ms);
    });
  };
  return MockServer;
})();
exports.MockServer = MockServer;
//# sourceMappingURL=MockServer.js.map
