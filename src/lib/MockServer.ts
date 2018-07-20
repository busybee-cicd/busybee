import * as express from 'express';
const server = express();
import * as bodyParser from 'body-parser';
import * as _ from 'lodash';
import * as hash from 'object-hash';
import * as httpProxy from 'http-proxy';
let restream = require('./restream');
import * as qs from 'querystring';
import {Logger} from './Logger';
import {ParsedTestSuite} from "../models/config/parsed/ParsedTestSuiteConfig";
import {BusybeeParsedConfig} from "../models/config/BusybeeParsedConfig";
import {MockServerConfig} from "../models/config/common/MockServerConfig";
import {ParsedTestEnvConfig} from "../models/config/parsed/ParsedTestEnvConfig";
import {ParsedTestSetConfig} from "../models/config/parsed/ParsedTestSetConfig";
import {RESTTest} from "../models/RESTTest";
import { RESTMock } from '../models/RESTMock';

export class MockServer {

  private conf: BusybeeParsedConfig;
  private testSuiteConf: ParsedTestSuite;
  private logger: Logger;
  private routeMap: any;
  private proxy: any;

  constructor(testSuiteConf: ParsedTestSuite, conf: BusybeeParsedConfig) {
    this.conf = conf;
    this.testSuiteConf = testSuiteConf;
    this.logger = new Logger(conf, this);
    this.logger.info('Initializing Mock Server');
    this.routeMap = {}; // store the routes and all of the known request combos for each route

    let serverConf: MockServerConfig = this.testSuiteConf.mockServer;
    if (serverConf && serverConf.proxy && !conf.noProxy) {
      this.logger.info(`Proxy config detected`);
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
    server.use(restream(null));
    server.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded
    if (this.corsActive()) {
      server.use((req, res, next) => {
        res.append('Access-Control-Allow-Origin', req.header('origin'));
        res.append('Access-Control-Allow-Credentials', 'true');
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
    let port = conf.ports[0];
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

        _.forEach(headers, (v: string, k) => {
          res.append(k, v);
        });

        return res.status(200).end();
      });
    }

    // build the routeMap
    this.logger.trace('testSuiteConf');
    this.logger.trace(this.testSuiteConf.testEnvs, true);
    this.testSuiteConf.testEnvs.forEach((testEnv: ParsedTestEnvConfig, envId: string) => {
      testEnv.testSets.forEach((testSet: ParsedTestSetConfig, testSetName: string) => {
        testSet.tests.forEach((test: RESTTest) => {
          let pass = false;
          if (test.expect && test.expect.status && !_.isFunction(test.expect.body)) {
            pass = true;
          } else if (test.mocks) {
            pass = _.every(test.mocks, (m) => {
              return (m.response && m.response.status)
            });
          }

          if (pass) {
            this.updateRouteMap(test);
          }
        });
      });
    })

    // iterate the routeMap and register each route to the server
    _.each(this.routeMap, (reqMethodMap, path) => {
      this.addRoute(path, reqMethodMap);
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

  // build an path that accounts for the root context
  getEndpoint(mock: RESTTest) {
    this.logger.trace(`getEndpoint`);
    this.logger.trace(mock, true);

    let path = mock.request.path;
    if (!_.isUndefined(mock.request.root)) {
      if (mock.request.root) { // allow users to set request.root to override mockServer.root && testSuiteConf.root when mocking
        path = `${mock.request.root}${path}`;
      } // else they passed null or false and we should not prepend a root (effectively overwriting mockServer.root or testSuiteConf.root
    } else if (!_.isUndefined(this.testSuiteConf.mockServer.root)) {
      if (this.testSuiteConf.mockServer.root != null) { // allow users to set mockServer.root to false to override testSuiteConf.root when mocking
        path = `${this.testSuiteConf.mockServer.root}${path}`;
      }
    } else if (this.testSuiteConf.root) {
      path = `${this.testSuiteConf.root}${path}`;
    }

    this.logger.trace(path);
    return path;
  }

  updateRouteMap(mock: RESTTest) {
    // // update the mockResponse with the globally applied headers according to the conf. (if any)
    // if (this.testSuiteConf.mockServer.injectedRequestOpts) {
    //   delete this.testSuiteConf.mockServer.injectedRequestOpts['description'];
    //   mockResponse.request = Object.assign({}, this.testSuiteConf.mockServer.injectedRequestOpts, mockResponse.request);
    // }

    // build an path that accounts for the root context
    let path = this.getEndpoint(mock);
    if (!this.routeMap[path]) {
      this.routeMap[path] = {
        get: {200: []},
        post: {200: []},
        put: {200: []},
        delete: {200: []},
        head: {200: []},
        options: {200: []}
      };
    }
    // 1. see if this req has already been recorded (could be in multiple sets)
    let request = mock.request;
    let requestOpts = this.buildReqOpts(request);
    // query params come into the controller as strings ALWAYS. so make sure our mockResponse query params are string
    if (requestOpts.query) {
      requestOpts.query = this.convertObjValuesToStrings(requestOpts.query);
    }

    let hashedReq = hash(requestOpts);
    // 1a. search the this.routeMap[test.request.path] for it using the hash
    let method = request.method.toLocaleLowerCase();
    let resStatus; // default to mockResponse
    if (!_.isEmpty(mock.mocks)) {
      resStatus = mock.mocks[0].response.status;
    } else {
      resStatus = mock.expect.status;
    }

    if (this.routeMap[path][method]) {
      if (this.routeMap[path][method][resStatus]) {
        if (_.find(this.routeMap[path][method], (reqInfo) => {
            return reqInfo.hash === hashedReq
          })) {
          // skip this one it exists
          return
        }
      } else {
        this.routeMap[path][method][resStatus] = []
      }
    } else {
      this.logger.info(`The method ${method} is not currently support for mocks`);
      return
    }

    // 2. register the request info for this route
    this.routeMap[path][method][resStatus].push(Object.assign({}, mock, {hash: hashedReq}, {matcherOpts: requestOpts}));
  }

  addRoute(path, reqMethodMap) {
    this.logger.debug(`addRoute ${path}, ${JSON.stringify(reqMethodMap)}`);

    _.forEach(reqMethodMap, (statusMap, methodName) => {
      // 1. build a controller
      let ctrl = async(req, res) => {
        this.logger.trace(req.path);
        // First we check to see if the requester wants a mockResponse with a specific status. If not, we default to 200
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
        this.logger.trace('INCOMING REQ OPTS');
        this.logger.trace(reqOpts, true);
        let hashedReq = hash(reqOpts);

        // find all mocks for this route and method that have the same hash of query/body params
        let matchingMocks = _.filter(mocks, (m) => {
          this.logger.trace('TESTING AGAINST');
          this.logger.trace(m.matcherOpts, true);
          this.logger.trace(`${m.hash} == ${hashedReq}`);
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
         now we need to inspect the headers. our mockResponse may only care about 1 or 2 headers
         but a request can have many more and therfore we can't just hash the whole thing
         and use that to compare on. we need to look for just the ones
         mentioned in the mockResponse.
         */
        let mocksWithoutHeaders = [];
        let mocksWithHeaders = new Array<RESTTest>();
        matchingMocks.forEach((m) => {
          this.logger.trace('checking mock');
          // mocks that don't have headers defined don't need to match. IF this array only has 1 item
          // and we don't have any addition matchingMocks with header needs, it will get returned as a default.
          if (!m.request.headers) {
            // mockResponse doesn't require any headers, it passes
            this.logger.trace(`mock doesn't require any headers`);
            return mocksWithoutHeaders.push(m);
          }

          // inject any request opts
          req = this.injectRequestOpts(req);
          let reqHeaders = req.headers;

          // to remove comparison errors, convert numbers to strings in both header objs
          reqHeaders = this.convertObjValuesToStrings(reqHeaders); // convert any numbers to strings
          let mockHeaders = this.convertObjValuesToStrings(m.request.headers);  // convert any numbers to strings
          this.logger.trace('mockHeaders');
          this.logger.trace(mockHeaders, true);
          let headersPass = true;
          _.forEach(mockHeaders, (value, headerName) => {
            if (value == null) {
              // if the header is null then that implies that we don't want to check for this header
              this.logger.trace(`mock headerName ${headerName} set to null, skipping match attempt`);
              return;
            }
            if (reqHeaders[headerName] !== value) {
              this.logger.trace(`${headerName} - ${reqHeaders[headerName]} !== ${value}`);
              headersPass = false;
            }
          });
          if (headersPass) {
            this.logger.trace(`Mock Passes - ${m.id}`);
            mocksWithHeaders.push(m);
          }
        });


        let mockToReturn:RESTTest;
        this.logger.trace("mocksWithoutHeaders");
        this.logger.trace(mocksWithoutHeaders, true);
        this.logger.trace("mocksWithHeaders");
        this.logger.trace(mocksWithHeaders, true);
        if (mocksWithHeaders.length == 1) {
          // mocksWithHeaders matched more deeply with the request (query+body+headers)
          // we should prioritize these if we have an exact match
          mockToReturn = mocksWithHeaders[0];
        }
        else if (mocksWithoutHeaders.length == 1) {
          // see if we have a single mockResponse without headers
          mockToReturn = mocksWithoutHeaders[0];
        } else {
          if (this.proxy) {
            this.logger.info("No mock matches request but proxy available. Proxying request");
            return this.proxy.web(req, res);
          } else {
            if (mocksWithoutHeaders.length == 0 && mocksWithHeaders.length == 0) {
              let message = "This request did not match any mocks and no proxy is available.";
              return res.status(404).json({err: message});
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
        let mockResponse;
        let mockData:RESTMock; // will be populated if a mock is provided
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
          _.forEach(resHeaders, (v, k) => {
            if (v == null) {
              return;
            }
            res.append(k, v);
          });
        }

        // check for a delay
        if (mockData && mockData.lag) {
          this.logger.info(`lagging response for ${mockData.lag} milliseconds`);
          await this.sleep(mockData.lag);
        }

        let bodyToReturn = mockResponse.body;
        return res.status(mockResponse.status).json(bodyToReturn);
      } // end ctrl

      // 2. register the route/method and ctrl
      this.logger.info(`Registering path ${path} : ${methodName}`);
      server[methodName](path, ctrl);
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
          this.logger.trace(`injectedRequestOpts.${target} detected. Injecting ${target}`);
          req[target] = Object.assign({}, mockServerConf.injectedRequestOpts[target], req[target]);
          this.logger.trace(`${target} injected`);
          this.logger.trace(req[target], true);
        }
      });
    }

    return req;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
