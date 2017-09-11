"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var server = express();
var bodyParser = require("body-parser");
var _ = require("lodash");
var hash = require("object-hash");
var httpProxy = require("http-proxy");
var qs = require("querystring");
var Logger_1 = require("./Logger");
var MockServer = /** @class */ (function () {
    function MockServer(testSuiteConf, conf) {
        this.conf = conf;
        this.testSuiteConf = testSuiteConf;
        this.logger = new Logger_1.Logger(conf, this);
        this.logger.info('Initializing Mock Server');
        this.routeMap = {}; // store the routes and all of the known request combos for each route
        var serverConf = this.testSuiteConf.mockServer;
        if (serverConf && serverConf.proxy && (testSuiteConf.cmdOpts && !testSuiteConf.cmdOpts.noProxy)) {
            if (!serverConf.proxy.protocol || !serverConf.proxy.host || !serverConf.proxy.port) {
                this.logger.warn("WARNING: mockServer proxy configuration does not contain required properties 'protocol', 'host' and 'port' \n Requests will not be proxied");
            }
            else {
                var proto = serverConf.proxy.protocol;
                var host = serverConf.proxy.host;
                var port = serverConf.proxy.port;
                this.logger.info("Creating proxy: " + proto + "://" + host + ":" + port);
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
    MockServer.prototype.init = function () {
        var _this = this;
        server.set('etag', false);
        server.use(bodyParser.json()); // for parsing application/json
        server.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
        if (this.corsActive()) {
            server.use(function (req, res, next) {
                res.append('Access-Control-Allow-Origin', req.header('origin'));
                res.append('Access-Control-Allow-Credentials', true);
                next();
            });
        }
        this.buildRoutes();
        var port = this.getServerPort();
        server.listen(port, function () {
            _this.logger.info("Mock Server listening on " + port);
        });
    };
    MockServer.prototype.getServerPort = function () {
        var conf = this.testSuiteConf;
        var port = conf.port;
        if (conf.mockServer && conf.mockServer.port) {
            port = conf.mockServer.port;
        }
        return port;
    };
    MockServer.prototype.corsActive = function () {
        return this.testSuiteConf.mockServer.cors !== false;
    };
    MockServer.prototype.buildRoutes = function () {
        var _this = this;
        // setup cors by default
        if (this.corsActive()) {
            this.logger.debug('CORS active');
            server.options('*', function (req, res, next) {
                var headers = {
                    'busybee-mock': true,
                    'Access-Control-Allow-Methods': 'GET,POST,DELETE,PUT,OPTIONS',
                    'Access-Control-Allow-Headers': req.header('Access-Control-Request-Headers'),
                    'Access-Control-Max-Age': 86400
                };
                _.forEach(headers, function (v, k) {
                    res.append(k, v);
                });
                return res.status(200).end();
            });
        }
        // build the routeMap
        _.each(this.testSuiteConf.testEnvs, function (testEnv, envId) {
            _.each(testEnv.testSets, function (testSet, testSetName) {
                testSet.tests.forEach(function (mock) {
                    _this.updateRouteMap(mock);
                });
            });
        });
        // iterate the routeMap and register each route to the server
        _.each(this.routeMap, function (reqMethodMap, endpoint) {
            _this.addRoute(endpoint, reqMethodMap);
        });
        // add a special catchall route for the proxy if necessary
        if (this.proxy) {
            server.all('*', function (req, res, next) {
                _this.logger.info('No Mock found, proxying request');
                _this.logger.info(req.method + " " + req.originalUrl);
                // if a call makes it here then it just needs to be proxied
                req = _this.injectRequestOpts(req);
                _this.proxy.web(req, res);
            });
        }
    };
    // build an endpoint that accounts for the root context
    MockServer.prototype.getEndpoint = function (mock) {
        var endpoint = mock.request.endpoint;
        if (!_.isUndefined(mock.request.root)) {
            if (mock.request.root != null) {
                endpoint = "" + mock.request.root + endpoint;
            }
        }
        else if (!_.isUndefined(this.testSuiteConf.mockServer.root)) {
            if (this.testSuiteConf.mockServer.root != null) {
                endpoint = "" + this.testSuiteConf.mockServer.root + endpoint;
            }
        }
        else if (this.testSuiteConf.root) {
            endpoint = "" + this.testSuiteConf.root + endpoint;
        }
        return endpoint;
    };
    MockServer.prototype.updateRouteMap = function (mock) {
        // // update the mock with the globally applied headers according to the conf. (if any)
        // if (this.testSuiteConf.mockServer.injectedRequestOpts) {
        //   delete this.testSuiteConf.mockServer.injectedRequestOpts['description'];
        //   mock.request = Object.assign({}, this.testSuiteConf.mockServer.injectedRequestOpts, mock.request);
        // }
        // build an endpoint that accounts for the root context
        var endpoint = this.getEndpoint(mock);
        if (!this.routeMap[endpoint]) {
            this.routeMap[endpoint] = {
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
        // query params come into the controller as strings ALWAYS. so make sure our mock query params are string
        if (requestOpts.query) {
            requestOpts.query = this.convertObjValuesToStrings(requestOpts.query);
        }
        var hashedReq = hash(requestOpts);
        // 1a. search the this.routeMap[test.request.endpoint] for it using the hash
        var method = request.method.toLocaleLowerCase();
        var resStatus = mock.expect.status;
        if (this.routeMap[endpoint][method]) {
            if (this.routeMap[endpoint][method][resStatus]) {
                if (_.find(this.routeMap[endpoint][method], function (reqInfo) { reqInfo.hash === hashedReq; })) {
                    // skip this one it exists
                    return;
                }
            }
            else {
                this.routeMap[endpoint][method][resStatus] = [];
            }
        }
        else {
            this.logger.info("The method " + method + " is not currently support for mocks");
            return;
        }
        // 2. register the request info for this route
        this.routeMap[endpoint][method][resStatus].push(Object.assign({}, mock, { hash: hashedReq }, { matcherOpts: requestOpts }));
    };
    MockServer.prototype.addRoute = function (endpoint, reqMethodMap) {
        var _this = this;
        this.logger.debug("addRoute " + endpoint + ", " + JSON.stringify(reqMethodMap));
        var mockServerConf = this.testSuiteConf.mockServer;
        _.forEach(reqMethodMap, function (statusMap, methodName) {
            // 1. build a controller
            var ctrl = function (req, res) {
                // First we check to see if the requester wants a mock with a specific status. If not, we default to 200
                var requestedStatus = 200;
                if (req.header('busybee-mock-status')) {
                    requestedStatus = parseInt(req.header('busybee-mock-status'));
                    if (!_.isInteger(requestedStatus)) {
                        return res.status(404).send("busybee-mock-status must be an Integer, was '" + req.header('busybee-mock-status') + "'");
                    }
                }
                // get the mocks for this statusCode
                var mocks = statusMap[requestedStatus];
                var reqOpts = _this.buildReqOpts(req);
                _this.logger.debug('INCOMING REQ OPTS');
                _this.logger.debug(reqOpts, true);
                var hashedReq = hash(reqOpts);
                // find all mocks for this route and method that have the same hash of query/body params
                var matchingMocks = _.filter(mocks, function (m) {
                    _this.logger.debug('TESTING AGAINST');
                    _this.logger.debug(m.matcherOpts, true);
                    _this.logger.debug(m.hash + " == " + hashedReq);
                    return m.hash === hashedReq;
                });
                if (!matchingMocks || matchingMocks.length === 0) {
                    if (_this.proxy) {
                        _this.proxy.web(req, res);
                    }
                    else {
                        res.status(404).end();
                    }
                    return;
                }
                /*
                 now we need to inspect the headers. our mock may only care about 1 or 2 headers
                 but a request can have many more and therfore we can't just hash the whole thing
                 and use that to compare on. we need to look for just the ones
                 mentioned in the mock.
                */
                var mocksWithoutHeaders = [];
                var mocksWithHeaders = [];
                matchingMocks.forEach(function (m) {
                    _this.logger.debug('checking mock');
                    // mocks that don't have headers defined don't need to match. IF this array only has 1 item
                    // and we don't have any addition matchingMocks with header needs, it will get returned as a default.
                    if (!m.request.headers) {
                        // mock doesn't require any headers, it passes
                        _this.logger.debug("mock doesn't require any headers");
                        return mocksWithoutHeaders.push(m);
                    }
                    // inject any request opts
                    req = _this.injectRequestOpts(req);
                    var reqHeaders = req.headers;
                    // to remove comparison errors, convert numbers to strings in both header objs
                    reqHeaders = _this.convertObjValuesToStrings(reqHeaders); // convert any numbers to strings
                    var mockHeaders = _this.convertObjValuesToStrings(m.request.headers); // convert any numbers to strings
                    _this.logger.debug('mockHeaders');
                    _this.logger.debug(mockHeaders, true);
                    var headersPass = true;
                    _.forEach(mockHeaders, function (value, headerName) {
                        if (value == null) {
                            // if the header is null then that implies that we don't want to check for this header
                            _this.logger.debug("mock headerName " + headerName + " set to null, skipping match attempt");
                            return;
                        }
                        if (reqHeaders[headerName] !== value) {
                            _this.logger.debug(headerName + " - " + reqHeaders[headerName] + " !== " + value);
                            headersPass = false;
                        }
                    });
                    if (headersPass) {
                        _this.logger.debug("Mock Passes - " + m.name);
                        mocksWithHeaders.push(m);
                    }
                });
                var mockToReturn;
                _this.logger.debug("mocksWithoutHeaders");
                _this.logger.debug(mocksWithoutHeaders, true);
                _this.logger.debug("mocksWithHeaders");
                _this.logger.debug(mocksWithHeaders, true);
                if (mocksWithHeaders.length == 1) {
                    // mocksWithHeaders matched more deeply with the request (query+body+headers)
                    // we should prioritize these if we have an exact match
                    mockToReturn = mocksWithHeaders[0];
                }
                else if (mocksWithoutHeaders.length == 1) {
                    // see if we have a single mock without headers
                    mockToReturn = mocksWithoutHeaders[0];
                }
                else {
                    if (_this.proxy) {
                        _this.logger.info("No mock matches request but proxy available. Proxying request");
                        return _this.proxy.web(req, res);
                    }
                    else {
                        if (mocksWithoutHeaders.length == 0 && mocksWithHeaders.length == 0) {
                            var message = "This request did not match any mocks and no proxy is available.";
                            return res.status(404).json({ err: message });
                        }
                        else {
                            var message = "This request is ambiguous due to multiple mocks sharing the name header requirements.";
                            return res.status(404).json({
                                err: message,
                                mocksInQuestion: mocksWithoutHeaders.concat(mocksWithHeaders)
                            });
                        }
                    }
                }
                // set headers
                res.append('busybee-mock', true);
                var resHeaders;
                if (mockToReturn.expect.headers) {
                    resHeaders = Object.assign({}, resHeaders, mockToReturn.expect.headers);
                }
                if (mockToReturn.expect.headers) {
                    _.forEach(resHeaders, function (v, k) {
                        if (v == null) {
                            return;
                        }
                        res.append(k, v);
                    });
                }
                _this.logger.debug(JSON.stringify(mockToReturn.expect.body));
                return res.status(mockToReturn.expect.status).json(mockToReturn.expect.body);
            }; // end ctrl
            // 2. register the route/method and ctrl
            _this.logger.info("Registering endpoint " + endpoint + " : " + methodName);
            server[methodName](endpoint, ctrl);
        });
    };
    MockServer.prototype.buildReqOpts = function (req) {
        var opts = {};
        if (!_.isEmpty(req.query)) {
            opts.query = req.query;
        }
        if (!_.isEmpty(req.body)) {
            opts.body = req.body;
        }
        return opts;
    };
    MockServer.prototype.convertObjValuesToStrings = function (obj) {
        var _this = this;
        var newObj = {};
        _.forEach(obj, function (value, key) {
            if (_.isObject(value)) {
                newObj[key] = _this.convertObjValuesToStrings(value);
            }
            else {
                if (!_.isNil(value)) {
                    newObj[key] = value.toString();
                    if (newObj[key]) {
                        newObj[key] = qs.unescape(newObj[key]);
                    }
                }
                else {
                    newObj[key] = value;
                }
            }
        });
        return newObj;
    };
    MockServer.prototype.injectRequestOpts = function (req) {
        var _this = this;
        var mockServerConf = this.testSuiteConf.mockServer;
        if (mockServerConf.injectedRequestOpts) {
            ['headers', 'query', 'body'].forEach(function (target) {
                if (mockServerConf.injectedRequestOpts[target]) {
                    _this.logger.debug("injectedRequestOpts." + target + " detected. Injecting " + target);
                    req[target] = Object.assign({}, mockServerConf.injectedRequestOpts[target], req[target]);
                    _this.logger.debug(target + " injected");
                    _this.logger.debug(req[target], true);
                }
            });
        }
        return req;
    };
    return MockServer;
}());
exports.MockServer = MockServer;
//# sourceMappingURL=MockServer.js.map