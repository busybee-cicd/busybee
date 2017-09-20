import * as express from 'express';
const server = express();
import * as bodyParser from 'body-parser';
import * as _ from 'lodash';
import * as hash from 'object-hash';
import * as httpProxy from 'http-proxy';
import * as qs from 'querystring';
import {Logger} from './Logger';
import {ParsedTestSuite} from "../config/parsed/ParsedTestSuiteConfig";
import {BusybeeParsedConfig} from "../config/BusybeeParsedConfig";
import {MockServerConfig} from "../config/common/MockServerConfig";

export class MockServer {

  private conf: any;
  private testSuiteConf: any;
  private logger: Logger;
  private routeMap: any;
  private proxy: any;

  constructor(testSuiteConf: ParsedTestSuite, conf: BusybeeParsedConfig) {
    this.conf = conf;
    this.testSuiteConf = testSuiteConf;
    this.logger = new Logger(conf, this);
    this.logger.info('Initializing Mock Server');
    this.routeMap = {}; // store the routes and all of the known request combos for each route

    let serverConf:MockServerConfig = this.testSuiteConf.mockServer;
    if (serverConf && serverConf.proxy && (conf.cmdOpts && !conf.cmdOpts)) {
      if (!serverConf.proxy.protocol || !serverConf.proxy.host || !serverConf.proxy.port) {
        this.logger.warn(`WARNING: mockServer proxy configuration does not contain required properties 'protocol', 'host' and 'port' \n Requests will not be proxied`);
      } else {
        let proto = serverConf.proxy.protocol;
        let host = serverConf.proxy.host;
        let port = serverConf.proxy.port;
        this.logger.info(`Creating proxy: ${proto}://${host}:${port}`);
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
      this.logger.info(`Mock Server listening on ${port}`)
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
          'busybee-mock': true,
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
    this.testSuiteConf.testEnvs.forEach((testEnv, envId) => {
      testEnv.testSets.forEach((testSet, testSetName) => {
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
        this.logger.info('No Mock found, proxying request');
        this.logger.info(`${req.method} ${req.originalUrl}`);
        // if a call makes it here then it just needs to be proxied
        req = this.injectRequestOpts(req);
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
      this.logger.info(`The method ${method} is not currently support for mocks`);
      return
    }

    // 2. register the request info for this route
    this.routeMap[endpoint][method][resStatus].push(Object.assign({}, mock, {hash: hashedReq}, {matcherOpts: requestOpts}));
  }

  addRoute(endpoint, reqMethodMap) {
    this.logger.debug(`addRoute ${endpoint}, ${JSON.stringify(reqMethodMap)}`);

    _.forEach(reqMethodMap, (statusMap, methodName) => {
      // 1. build a controller
      let ctrl = (req, res) => {
        // First we check to see if the requester wants a mock with a specific status. If not, we default to 200
        let requestedStatus = 200;
        if (req.header('busybee-mock-status')) {
          requestedStatus = parseInt(req.header('busybee-mock-status'));
          if (!_.isInteger(requestedStatus)) {
            return res.status(404).send(`busybee-mock-status must be an Integer, was '${req.header('busybee-mock-status')}'`)
          }
        }

        // get the mocks for this statusCode
        let mocks = statusMap[requestedStatus];
        let reqOpts = this.buildReqOpts(req);
        this.logger.debug('INCOMING REQ OPTS');
        this.logger.debug(reqOpts, true);
        let hashedReq = hash(reqOpts);

        // find all mocks for this route and method that have the same hash of query/body params
        let matchingMocks = _.filter(mocks, (m) => {
          this.logger.debug('TESTING AGAINST');
          this.logger.debug(m.matcherOpts, true);
          this.logger.debug(`${m.hash} == ${hashedReq}`);
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

          // inject any request opts
          req = this.injectRequestOpts(req);
          let reqHeaders = req.headers;

          // to remove comparison errors, convert numbers to strings in both header objs
          reqHeaders = this.convertObjValuesToStrings(reqHeaders); // convert any numbers to strings
          let mockHeaders = this.convertObjValuesToStrings(m.request.headers);  // convert any numbers to strings
          this.logger.debug('mockHeaders');
          this.logger.debug(mockHeaders, true);
          let headersPass = true;
          _.forEach(mockHeaders, (value, headerName) => {
            if (value == null) {
              // if the header is null then that implies that we don't want to check for this header
              this.logger.debug(`mock headerName ${headerName} set to null, skipping match attempt`);
              return;
            }
            if (reqHeaders[headerName] !== value) {
              this.logger.debug(`${headerName} - ${reqHeaders[headerName]} !== ${value}`);
              headersPass = false;
            }
          });
          if (headersPass) {
            this.logger.debug(`Mock Passes - ${m.name}`);
            mocksWithHeaders.push(m);
          }
        });


        let mockToReturn;
        this.logger.debug("mocksWithoutHeaders");
        this.logger.debug(mocksWithoutHeaders, true);
        this.logger.debug("mocksWithHeaders");
        this.logger.debug(mocksWithHeaders, true);
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
        res.append('busybee-mock', true);
        let resHeaders;
        if (mockToReturn.expect.headers) {
          resHeaders = Object.assign({}, resHeaders, mockToReturn.expect.headers);
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

  buildReqOpts(req): any {
    let opts = <any>{};

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
        if (!_.isNil(value)) {
          newObj[key] = value.toString();
          if (newObj[key]) {
            newObj[key] = qs.unescape(newObj[key])
          }
        } else {
          newObj[key] = value;
        }
      }
    });

    return newObj;
  }

  injectRequestOpts(req) {
    let mockServerConf = this.testSuiteConf.mockServer;

    if (mockServerConf.injectedRequestOpts) {
      ['headers', 'query', 'body'].forEach((target) => {
        if (mockServerConf.injectedRequestOpts[target]) {
          this.logger.debug(`injectedRequestOpts.${target} detected. Injecting ${target}`);
          req[target] = Object.assign({}, mockServerConf.injectedRequestOpts[target], req[target]);
          this.logger.debug(`${target} injected`);
          this.logger.debug(req[target], true);
        }
      });
    }

    return req;
  }
}
