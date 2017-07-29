const express = require('express');
const server = express();
const bodyParser = require('body-parser');
const _ = require('lodash');
const hash = require('object-hash');

class MockServer {
  constructor(conf) {
    console.log("Initializing Mock Server");
    this.conf = conf;
    this.routeMap = {}; // store the routes and all of the known request combos for each route
    this.init();
  }

  init() {
    server.use(bodyParser.json()); // for parsing application/json
    server.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

    this.buildRoutes();
    server.listen(3000, function() {
      console.log('Example app listening on port 3000!')
    });
  }

  buildRoutes() {
    // build trhe routeMap
    _.each(this.conf.restApi.testSets, (testSet, testSetName) => {
      testSet.tests.forEach((mock) => {
        this.updateRouteMap(mock);
      });
    });

    console.log(JSON.stringify(this.routeMap));
    // iterate the routeMap and register each route to the server
    _.each(this.routeMap, (requests, endpoint) => {
      this.addRoute(endpoint, requests);
    });
  }

  updateRouteMap(mock) {
    // update the mock with the globally applied headers according to the conf. (if any)
    if (this.conf.restApi && this.conf.restApi.defaultRequestOpts) {
      mock.request = Object.assign({}, this.conf.restApi.defaultRequestOpts, mock.request);
    }

    if (!this.routeMap[mock.request.endpoint]) {
      this.routeMap[mock.request.endpoint] = {
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
    if (_.find(this.routeMap[mock.request.endpoint][method], (reqInfo) => { reqInfo.hash === hashedReq})) {
      // skip this one it exists
      return
    }

    // 2. register the request info for this route
    this.routeMap[mock.request.endpoint][method].push(Object.assign(mock, {hash: hashedReq}, {matcherOpts: requestOpts}));
  }

  addRoute(endpoint, methods) {
    _.forEach(methods, (mocks, methodName) => {
      // 1. build a controller
      let ctrl = (req, res) => {
        let reqOpts = this.buildReqOpts(req);
        console.log("INCOMING REQ OPTS");
        console.log(reqOpts);
        let hashedReq = hash(reqOpts);

        // find all mocks for this route and method that have the same hash of query/body params
        let matchingMocks = _.filter(mocks, (m) => {
          console.log("TESTING AGAINST")
          console.log(m.matcherOpts);
          return m.hash === hashedReq;
        });

        if (!matchingMocks || matchingMocks.length === 0) {
          res.status(404).end();
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
          console.log("checking mock");
          console.log(JSON.stringify(m));
          if (!m.request.headers) {
            // mock doesn't require any headers, it passes
            return mocksThatPass.push(m);
          }

          let mockPasses = true;
          _.forEach(m.request.headers, (value, headerName) => {
            if (req.header(headerName) != value) {
              mockPasses = false;
            }
          });
          if (mockPasses) {
            mocksThatPass.push(m);
          }
        });

        if (mocksThatPass.length == 0) {
          let message = "Atleast one mock was identified for this route with these query and body params but not these headers";
          console.log(message);
          return res.status(404).json({
            err: message,
            mocksInQuestion: matchingMocks
          });
        }
        if (mocksThatPass.length > 1) {
          let message = "This request is ambgious due to multiple mocks sharing the name header requirements."
          return res.status(404).json({
            err: message,
            mocksInQuestion: mocksThatPass
          });
        }

        res.status(mocksThatPass[0].expect.status).json(mocksThatPass[0].expect.body);
      }

      // 2. register the route/method and ctrl
      let routeName;
      if (this.conf.restApi.root) {
        routeName = `${this.conf.restApi.root}${endpoint}`;
      } else {
        routeName = endpoint;
      }

      server[methodName](routeName, ctrl);
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
