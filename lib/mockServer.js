const express = require('express');
const server = express();
const bodyParser = require('body-parser');
const _ = require('lodash');
const hash = require('object-hash');
const httpProxy = require('http-proxy');
const Logger = require('./logger');

class MockServer {
  constructor(conf) {
    console.log('Initializing Mock Server');
    this.conf = conf;
    this.logger = new Logger(conf);
    this.routeMap = {}; // store the routes and all of the known request combos for each route
    if (this.conf.mockServer && this.conf.mockServer.proxy) {
      if (!this.conf.mockServer.proxy.protocol || !this.conf.mockServer.proxy.host || !this.conf.mockServer.proxy.port) {
        console.log(`WARNING: mockServer proxy configuration does not contain required properties 'protocol', 'host' and 'port' \n Requests will not be proxied`);
      } else {
        let proto = this.conf.mockServer.proxy.protocol;
        let host = this.conf.mockServer.proxy.host;
        let port = this.conf.mockServer.proxy.port;
        console.log(`Creating proxy: ${proto}://${host}:${port}`);
        this.proxy = new httpProxy.createProxyServer({
          target: {
            host: this.conf.mockServer.proxy.host,
            port: this.conf.mockServer.proxy.port
          }
        });
      }
    }

    this.init();
  }

  init() {
    let conf = this.conf;
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
    let port = this.conf.restApi.port;
    if (this.conf.mockServer && this.conf.mockServer.port) {
      port = this.conf.mockServer.port;
    }

    return port;
  }

  corsActive() {
    return this.conf.mockServer.cors !== false
  }

  buildRoutes() {
    // setup cors by default
    if (this.corsActive()) {
      if (this.conf.debug) {
        console.log('CORS active');
      }

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

    // build trhe routeMap
    _.each(this.conf.restApi.testSets, (testSet, testSetName) => {
      testSet.tests.forEach((mock) => {
        this.updateRouteMap(mock);
      });
    });

    // iterate the routeMap and register each route to the server
    _.each(this.routeMap, (requests, endpoint) => {
      this.addRoute(endpoint, requests);
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
      if (mock.request.root != null) { // allow users to set request.root to false to override mockServer.root && restApi.root when mocking
        endpoint = `${mock.request.root}${endpoint}`;
      }
    } else if (!_.isUndefined(this.conf.mockServer.root)) {
      if (this.conf.mockServer.root != null) { // allow users to set mockServer.root to false to override restApi.root when mocking
        endpoint = `${this.conf.mockServer.root}${endpoint}`;
      }
    } else if (this.conf.restApi.root) {
      endpoint = `${this.conf.restApi.root}${endpoint}`;
    }

    return endpoint;
  }

  updateRouteMap(mock) {
    // update the mock with the globally applied headers according to the conf. (if any)
    if (this.conf.restApi && this.conf.restApi.defaultRequestOpts) {
      mock.request = Object.assign({}, this.conf.restApi.defaultRequestOpts, mock.request);
    }

    // build an endpoint that accounts for the root context
    let endpoint = this.getEndpoint(mock);
    if (!this.routeMap[endpoint]) {
      this.routeMap[endpoint] = {
        get: [],
        post: [],
        put: [],
        delete: [],
        head: []
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
    if (_.find(this.routeMap[endpoint][method], (reqInfo) => { reqInfo.hash === hashedReq})) {
      // skip this one it exists
      return
    }

    // 2. register the request info for this route
    this.routeMap[endpoint][method].push(Object.assign(mock, {hash: hashedReq}, {matcherOpts: requestOpts}));
  }

  addRoute(endpoint, methods) {
    let mockServerConf = this.conf.mockServer;
    _.forEach(methods, (mocks, methodName) => {
      // 1. build a controller
      let ctrl = (req, res) => {
        let reqOpts = this.buildReqOpts(req);
        this.logger.debug('INCOMING REQ OPTS');
        this.logger.debug(reqOpts);
        let hashedReq = hash(reqOpts);

        // find all mocks for this route and method that have the same hash of query/body params
        let matchingMocks = _.filter(mocks, (m) => {
          this.logger.debug('TESTING AGAINST');
          this.logger.debug(m.matcherOpts);
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
        let mocksThatPass = [];
        matchingMocks.forEach((m) => {
          this.logger.debug('checking mock');
          if (!m.request.headers) {
            // mock doesn't require any headers, it passes
            this.logger.debug(`mock doesn't require any headers`);
            return mocksThatPass.push(m);
          }

          let mockPasses = true;
          let reqHeaders = m.request.headers;
          if (mockServerConf.decorateRequestOpts && mockServerConf.decorateRequestOpts.headers) {
            reqHeaders = Object.assign(mockServerConf.decorateRequestOpts.headers, reqHeaders);
          }
          _.forEach(reqHeaders, (value, headerName) => {
            if (value == null) {
              // if the header is null then that implies that we don't want to check for this header
              this.logger.debug(`mock headerName ${headerName} set to null, skipping match attempt`);
              return;
            }
            if (reqHeaders[headerName] != value) {
              this.logger.debug(`${headerName} - ${reqHeaders.reqHeaders[headerName]} !== ${value}`);
              mockPasses = false;
            }
          });
          if (mockPasses) {
            this.logger.debug(`Mock Passes - ${m.name}`);
            mocksThatPass.push(m);
          }
        });

        // We passed the header test, now to decide if this mock is ambiguous
        if (mocksThatPass.length == 0) {
          let message = "Atleast one mock was identified for this route with these query and body params but not these headers";
          console.log(message);
          return res.status(404).json({
            err: message,
            mocksInQuestion: matchingMocks
          });
        }
        if (mocksThatPass.length > 1) {
          let message = "This request is ambiguous due to multiple mocks sharing the name header requirements."
          return res.status(404).json({
            err: message,
            mocksInQuestion: mocksThatPass
          });
        }

        // set headers
        res.append('feeny-mock', true);
        let resHeaders;
        if (mocksThatPass[0].expect.headers) {
          resHeaders = Object.assign(resHeaders, mocksThatPass[0].expect.headers);
        }
        if (mocksThatPass[0].expect.headers) {
          _.forEach(resHeaders, (v,k) => {
            if (v == null) { return; }
            res.append(k,v);
          });
        }

        let mockToReturn = mocksThatPass[0];
        this.logger.debug(JSON.stringify(mockToReturn.expect.body));
        return res.status(mockToReturn.expect.status).json(mockToReturn.expect.body);
      } // end ctrl

      // 2. register the route/method and ctrl
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
