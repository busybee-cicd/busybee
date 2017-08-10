let request = require('request');
const _async = require('async');
const _ = require('lodash');
const Logger = require('./logger');

class RESTManager {
  constructor(conf, suiteEnvConf) {
    this.suiteEnvConf = suiteEnvConf;
    this.logger = new Logger(conf);
    this.apiRequest = request;
    if (suiteEnvConf.defaultRequestOpts)
      this.apiRequest = request.defaults(suiteEnvConf.defaultRequestOpts);

    if (conf.debug) {
      this.apiRequest.debug = true;
    }

    this.logger.debug('RESTManager');
    this.logger.debug(JSON.stringify(suiteEnvConf, null, '\t'));
  }

  buildBaseUrl(requestConf, port) {
    this.logger.debug('buildBaseUrl');
    let protocol = this.suiteEnvConf.protocol;
    let hostName = this.suiteEnvConf.hostName;
    // TODO: REMOVE THESE CMDOPTS or refactor to be perTestSuite
    // if (this.conf.cmdOpts) {
    //   if (this.conf.cmdOpts.protocol) {
    //     protocol = this.conf.cmdOpts.protocol;
    //   }
    //   if (this.conf.cmdOpts.host) {
    //     host = this.conf.cmdOpts.host;
    //   }
    // }

    let url = `${protocol}://${hostName}`;
    if (port) {
      url += `:${port}`;
    }

    if (!_.isUndefined(requestConf.root)) {
      // allow override of root from requestConf
      if (requestConf.root != null) {
        url += requestConf.root;
      }
    }
    else if (this.suiteEnvConf.root) {
      // else use root from resApi conf
      url += this.suiteEnvConf.root;
    }

    return url;
  }

  buildRequest(requestConf, port) {
    this.logger.debug(`buildRequestUrl ${JSON.stringify(requestConf)} ${port}`);

    let url = this.buildBaseUrl(requestConf, port);
    if (requestConf.endpoint) {
      if (requestConf.endpoint.startsWith("/")) {
        url += requestConf.endpoint;
      } else {
        url += `/${requestConf.endpoint}`;
      }
    }

    let req = Object.assign({},
      {
        method: requestConf.method,
        url: url,
        qs: requestConf.query,
        body: requestConf.body,
        timeout: requestConf.timeout || 30000 // default 30 seconds
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
          this.logger.info(`testSet ${testSet.id}:${test.name} contains no request information`);
          return cb(null);
        }
        if (test.skip || test.mock) {
          return cb(null);
        }

        // build request
        let opts = this.buildRequest(test.request, port);
        this.logger.debug(opts);

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
        this.logger.info(`${testSet.id}: ${testIndex}: ${test.name}`)

        // run the test
        this.apiRequest(opts, (err, res, body) => {
          if (err) { return cb(err); }

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
              if (res.headers[headerName] != v) {
                testResult.headers[headerName] = `Expected ${v} was ${res.headers[headerName]}`;
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
