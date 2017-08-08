const express = require('express');
const server = express();
const bodyParser = require('body-parser');
const _ = require('lodash');
const hash = require('object-hash');
const httpProxy = require('http-proxy');
const Logger = require('./logger');

class MockServer {
  constructor(testSuiteConf, DEBUG) {
    console.log('Initializing Mock Server');
    this.testSuiteConf = testSuiteConf;
    this.logger = new Logger({debug: DEBUG});
    this.routeMap = {}; // store the routes and all of the known request combos for each route

    if (this.testSuiteConf.mockServer && this.testSuiteConf.mockServer.proxy) {
      if (!this.testSuiteConf.mockServer.proxy.protocol || !this.testSuiteConf.mockServer.proxy.host || !this.testSuiteConf.mockServer.proxy.port) {
        console.log(`WARNING: mockServer proxy configuration does not contain required properties 'protocol', 'host' and 'port' \n Requests will not be proxied`);
      } else {
        let proto = this.testSuiteConf.mockServer.proxy.protocol;
        let host = this.testSuiteConf.mockServer.proxy.host;
        let port = this.testSuiteConf.mockServer.proxy.port;
        console.log(`Creating proxy: ${proto}://${host}:${port}`);
        this.proxy = new httpProxy.createProxyServer({
          target: {
            host: this.testSuiteConf.mockServer.proxy.host,
            port: this.testSuiteConf.mockServer.proxy.port
          }
        });
      }
    }

    this.init();
  }

  init() {
    server.set('etag', false);
    server.use(bodyParser.json()); // for parsing application/json
    server.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
    if (this.corsActive()) {
      server.use((req, res, next) => {
        res.append('Access-Control-Allow-Origin', req.header('origin'));
        res.append('Access-Control-Allow-Credentials', true);
        next();
      });
    }
    this.buildRoutes();

    let port = this.getServerPort();
    server.listen(port, () => {
      console.log(`Mock Server listening on ${port}`)
    });
  }

  getServerPort() {
    let conf = this.testSuiteConf;
    let port = conf.port;
    if (conf.mockServer && conf.mockServer.port) {
      port = conf.mockServer.port;
    }

    return port;
  }

  corsActive() {
    return this.testSuiteConf.mockServer.cors !== false
  }

  buildRoutes() {
    // setup cors by default
    if (this.corsActive()) {
      this.logger.debug('CORS active');

      server.options('*', (req, res, next) => {
        let headers = {
          'feeny-mock': true,
          'Access-Control-Allow-Methods': 'GET,POST,DELETE,PUT,OPTIONS',
          'Access-Control-Allow-Headers': req.header('Access-Control-Request-Headers'),
          'Access-Control-Max-Age': 86400
        }

        _.forEach(headers, (v, k) => {
          res.append(k, v);
        });

        return res.status(200).end();
      });
    }

    // build the routeMap
    _.each(this.testSuiteConf.testEnvs, (testEnv, envId) => {
      _.each(testEnv.testSets, (testSet, testSetName) => {
        testSet.tests.forEach((mock) => {
          this.updateRouteMap(mock);
        });
      });
    })

    // iterate the routeMap and register each route to the server
    _.each(this.routeMap, (reqMethodMap, endpoint) => {
      this.addRoute(endpoint, reqMethodMap);
    });

    // add a special catchall route for the proxy if necessary
    if (this.proxy) {
      server.all('*', (req, res, next) => {
        this.logger.debug('No Mock found, proxying request');
        this.logger.debug(`${req.method} ${req.originalUrl}`);
        // if a call makes it here then it just needs to be proxied
        this.proxy.web(req, res);
      });
    }
  }

  // build an endpoint that accounts for the root context
  getEndpoint(mock) {
    let endpoint = mock.request.endpoint;
    if (!_.isUndefined(mock.request.root)) {
      if (mock.request.root != null) { // allow users to set request.root to false to override mockServer.root && testSuiteConf.root when mocking
        endpoint = `${mock.request.root}${endpoint}`;
      }
    } else if (!_.isUndefined(this.testSuiteConf.mockServer.root)) {
      if (this.testSuiteConf.mockServer.root != null) { // allow users to set mockServer.root to false to override testSuiteConf.root when mocking
        endpoint = `${this.testSuiteConf.mockServer.root}${endpoint}`;
      }
    } else if (this.testSuiteConf.root) {
      endpoint = `${this.testSuiteConf.root}${endpoint}`;
    }

    return endpoint;
  }

  updateRouteMap(mock) {
    // // update the mock with the globally applied headers according to the conf. (if any)
    // if (this.testSuiteConf.mockServer.injectedRequestOpts) {
    //   delete this.testSuiteConf.mockServer.injectedRequestOpts['description'];
    //   mock.request = Object.assign({}, this.testSuiteConf.mockServer.injectedRequestOpts, mock.request);
    // }

    // build an endpoint that accounts for the root context
    let endpoint = this.getEndpoint(mock);
    if (!this.routeMap[endpoint]) {
      this.routeMap[endpoint] = {
        get: {200:[]},
        post: {200:[]},
        put: {200:[]},
        delete: {200:[]},
        head: {200:[]},
        options: {200:[]}
      };
    }
    // 1. see if this req has already been recorded (could be in multiple sets)
    let request = mock.request;
    let requestOpts = this.buildReqOpts(request);
    // query params come into the controller as strings ALWAYS. so make sure our mock query params are string
    if (requestOpts.query) {
      requestOpts.query = this.convertObjValuesToStrings(requestOpts.query);
    }

    let hashedReq = hash(requestOpts);
    // 1a. search the this.routeMap[test.request.endpoint] for it using the hash
    let method = request.method.toLocaleLowerCase();
    let resStatus = mock.expect.status;
    if (this.routeMap[endpoint][method]) {
      if (this.routeMap[endpoint][method][resStatus]) {
        if (_.find(this.routeMap[endpoint][method], (reqInfo) => { reqInfo.hash === hashedReq})) {
          // skip this one it exists
          return
        }
      } else {
        this.routeMap[endpoint][method][resStatus] = []
      }
    } else {
      console.log(`The method ${method} is not currently support for mocks`);
      return
    }

    // 2. register the request info for this route
    this.routeMap[endpoint][method][resStatus].push(Object.assign(mock, {hash: hashedReq}, {matcherOpts: requestOpts}));
  }

  addRoute(endpoint, reqMethodMap) {
    this.logger.debug(`addRoute ${endpoint}, ${JSON.stringify(reqMethodMap)}`);

    let mockServerConf = this.testSuiteConf.mockServer;
    _.forEach(reqMethodMap, (statusMap, methodName) => {
      // 1. build a controller
      let ctrl = (req, res) => {
        // First we check to see if the requester wants a mock with a specific status. If not, we default to 200
        let requestedStatus = 200;
        if (req.header('feeny-mock-status')) {
          requestedStatus = parseInt(req.header('feeny-mock-status'));
          if (!_.isInteger(requestedStatus)) {
            return res.status(404).send(`feeny-mock-status must be an Integer, was '${req.header('feeny-mock-status')}'`)
          }
        }

        // get the mocks for this statusCode
        let mocks = statusMap[requestedStatus];
        let reqOpts = this.buildReqOpts(req);
        this.logger.debug('INCOMING REQ OPTS');
        this.logger.debug(JSON.stringify(reqOpts, null, '\t'));
        let hashedReq = hash(reqOpts);

        // find all mocks for this route and method that have the same hash of query/body params
        let matchingMocks = _.filter(mocks, (m) => {
          this.logger.debug('TESTING AGAINST');
          this.logger.debug(JSON.stringify(m.matcherOpts, null, '\t'));
          return m.hash === hashedReq;
        });

        if (!matchingMocks || matchingMocks.length === 0) {
          if (this.proxy) {
            this.proxy.web(req, res);
          } else {
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
        let mocksWithoutHeaders = [];
        let mocksWithHeaders = [];
        matchingMocks.forEach((m) => {
          this.logger.debug('checking mock');
          // mocks that don't have headers defined don't need to match. IF this array only has 1 item
          // and we don't have any addition matchingMocks with header needs, it will get returned as a default.
          if (!m.request.headers) {
            // mock doesn't require any headers, it passes
            this.logger.debug(`mock doesn't require any headers`);
            return mocksWithoutHeaders.push(m);
          }

          let reqHeaders = req.headers;
           // ensure our mocks only use strings; (for comparison reasons)
          let mockHeaders = this.convertObjValuesToStrings(m.request.headers);
          if (mockServerConf.injectedRequestOpts && mockServerConf.injectedRequestOpts.headers) {
            this.logger.debug(`injectedRequestOpts.headers detected. Injecting headers`);
            reqHeaders = Object.assign(mockServerConf.injectedRequestOpts.headers, reqHeaders);
          }
          _.forEach(mockHeaders, (value, headerName) => {
            if (value == null) {
              // if the header is null then that implies that we don't want to check for this header
              this.logger.debug(`mock headerName ${headerName} set to null, skipping match attempt`);
              return;
            }
            if (reqHeaders[headerName] !== value) {
              this.logger.debug(`${headerName} - ${reqHeaders[headerName]} !== ${value}`);
              return;
            }

            this.logger.debug(`Mock Passes - ${m.name}`);
            mocksWithHeaders.push(m);
          });
        });


        let mockToReturn;
        this.logger.debug("mocksWithoutHeaders");
        this.logger.debug(JSON.stringify(mocksWithoutHeaders, null, '\t'));
        this.logger.debug("mocksWithHeaders");
        this.logger.debug(JSON.stringify(mocksWithHeaders, null, '\t'));
        if (mocksWithHeaders.length == 1) {
          // mocksWithHeaders matched more deeply with the request (query+body+headers)
          // we should prioritize these if we have an exact match
          mockToReturn = mocksWithHeaders[0];
        }
        else if (mocksWithoutHeaders.length == 1) {
          // see if we have a single mock without headers
          mockToReturn = mocksWithoutHeaders[0];
        } else {
          if (this.proxy) {
            this.logger.info("No mock matches request but proxy available. Proxying request");
            return this.proxy.web(req, res);
          } else {
            if (mocksWithoutHeaders.length == 0 && mocksWithHeaders.length == 0) {
              let message = "This request did not match any mocks and no proxy is available.";
              return res.status(404).json({ err: message });
            } else {
              let message = "This request is ambiguous due to multiple mocks sharing the name header requirements.";
              return res.status(404).json({
                err: message,
                mocksInQuestion: mocksWithoutHeaders.concat(mocksWithHeaders)
              });
            }
          }
        }

        // set headers
        res.append('feeny-mock', true);
        let resHeaders;
        if (mockToReturn.expect.headers) {
          resHeaders = Object.assign(resHeaders, mockToReturn.expect.headers);
        }
        if (mockToReturn.expect.headers) {
          _.forEach(resHeaders, (v,k) => {
            if (v == null) { return; }
            res.append(k,v);
          });
        }

        this.logger.debug(JSON.stringify(mockToReturn.expect.body));
        return res.status(mockToReturn.expect.status).json(mockToReturn.expect.body);
      } // end ctrl

      // 2. register the route/method and ctrl
      this.logger.info(`Registering endpoint ${endpoint} : ${methodName}`);
      server[methodName](endpoint, ctrl);
    });
  }

  buildReqOpts(req) {
    let opts = {};

    if (!_.isEmpty(req.query)) {
      opts.query = req.query
    }

    if (!_.isEmpty(req.body)) {
      opts.body = req.body
    }

    return opts;
  }

  convertObjValuesToStrings(obj) {
    let newObj = {}
    _.forEach(obj, (value, key) => {
      if (_.isObject(value)) {
        newObj[key] = this.convertObjValuesToStrings(value);
      } else {
        newObj[key] = value.toString();
      }
    });

    return newObj;
  }
}


module.exports = MockServer;
