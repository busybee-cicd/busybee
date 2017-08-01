let request = require('request');
const _async = require('async');
const _ = require('lodash');
const Logger = require('./logger');

class RESTManager {
  constructor(conf) {
    this.conf = conf;
    this.logger = new Logger(conf);
    this.apiRequest = request;
    if (conf.restApi && conf.restApi.defaultRequestOpts)
      this.apiRequest = request.defaults(conf.restApi.defaultRequestOpts);

    if (conf.debug) {
      this.apiRequest.debug = true;
    }
  }

  buildBaseUrl(requestConf, port) {
    let restApiConf = this.conf.restApi;
    let protocol = restApiConf.protocol;
    let host = restApiConf.host;
    if (this.conf.cmdOpts) {
      if (this.conf.cmdOpts.protocol) {
        protocol = this.conf.cmdOpts.protocol;
      }
      if (this.conf.cmdOpts.host) {
        host = this.conf.cmdOpts.host;
      }
    }

    let url = `${protocol}://${host}`;
    if (port) {
      url += `:${port}`;
    }

    if (!_.isUndefined(requestConf.root)) {
      // allow override of root from requestConf
      if (requestConf.root != null) {
        url += requestConf.root;
      }
    }
    else if (restApiConf.root) {
      // else use root from resApi conf
      url += restApiConf.root;
    }

    return url;
  }

  buildRequest(requestConf, port) {
    this.logger.debug(`buildRequestUrl ${JSON.stringify(requestConf)} ${port}`);

    let url = this.buildBaseUrl(requestConf, port);
    if (requestConf.endpoint)
      url += requestConf.endpoint

    let req = Object.assign({},
      {
        method: requestConf.method,
        url: url,
        qs: requestConf.query,
        body: requestConf.body
      },
      requestConf.requestOpts
    );

    this.logger.debug(`request built`);
    this.logger.debug(`${JSON.stringify(req)}`);
    return req;
  }

  buildTestTasks(testSet, port) {
    return testSet.tests.map((test, i) => {
      /**
       Move all dis to restManager
      */
      return (cb) => {
        if (!test.request) {
          console.log(`testSet ${testSet.id}:${test.name} contains no request information`);
          cb(null);
        }
        if (test.skip || test.mock) {
          cb(null);
        }

        // build request
        let opts = this.buildRequest(test.request, port);

        // make request
        if (this.conf.debug)
          console.log(opts);

        // figure out if this test is running at a specific index. (just nice for consoling)
        let testIndex;
        if (_.isUndefined(test.testSet)) {
          testIndex = '#';
        } else {
          // we have more than one testSet configuration for this test. find the one
          // matching the current testSet
          let testSetConf = test.testSet;
          if (Array.isArray(testSetConf)) {
            testSetConf = _.find(testSetConf, (c) => {
              return c.id == testSet.id;
            });
          }

          if (_.isUndefined(testSetConf.index)) {
            testIndex = '#';
          } else {
            testIndex = testSetConf.index;
          };

        }
        console.log(`${testSet.id}: ${testIndex}: ${test.name}`)

        // run the test
        this.apiRequest(opts, (err, res, body) => {
          if (err)
            cb(err);

          // validate results
          let testResult = {name: test.name, index: test.testIndex};
          if (test.expect.headers) {
            testResult.headers = {};
          }

          if (test.expect.status) {
            testResult.status = res.statusCode == test.expect.status
              ? true
              : `Expected ${test.expect.status} was ${res.statusCode}`
          }

          if (test.expect.body) {
            testResult.body = _.isEqual(body, test.expect.body)
              ? true
              : `Expected ${JSON.stringify(test.expect.body)} was ${JSON.stringify(body)}`
          }

          if (test.expect.headers) {
            _.forEach(test.expect.headers, (v, headerName) => {
              if (res.header(headerName) != v) {
                testResult.headers[headerName] = `Expected ${v} was ${res.header(headerName)}`;
              } else {
                testResult.headers[headerName] = true;
              }
            });
          }

          cb(null, testResult);
        });
      };
    });
  }
}

module.exports = RESTManager;
