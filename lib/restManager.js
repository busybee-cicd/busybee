let request = require('request');
const _async = require('async');
const _ = require('lodash');

class RESTManager {
  constructor(conf) {
    this.conf = conf;
    this.apiRequest = request;
    if (conf.restApi && conf.restApi.defaultRequestOpts)
      this.apiRequest = request.defaults(conf.restApi.defaultRequestOpts);

    if (conf.debug) {
      this.apiRequest.debug = true;
    }
  }

  buildBaseUrl(port) {
    let restApiConf = this.conf.restApi;
    let url = `${restApiConf.protocol}://${restApiConf.host}`;
    if (port)
      url += `:${port}`;
    if (restApiConf.root)
      url += restApiConf.root;

    return url;
  }

  buildRequest(requestConf, port) {
    if (this.conf.debug) {
      console.log(`buildRequestUrl ${JSON.stringify(requestConf)} ${port}`);
    }

    let url = this.buildBaseUrl(port);
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

    return req;
  }

  buildTestTasks(testSet, port) {
    return testSet.tests.map((test, i) => {
      /**
       Move all dis to restManager
      */
      return (cb) => {
        if (!test.request) {
          console.log(`testSet ${testSet.name}:${test.name} contains no request information`);
          cb(null);
        }

        // build request
        let opts = this.buildRequest(test.request, port);

        // make request
        if (this.conf.debug)
          console.log(opts);

        let consoleText;
        if (_.isUndefined(test.testIndex)) {
          consoleText = `${testSet.id}: #: ${test.name}`;
        } else {
          consoleText = `${testSet.id}: ${test.testIndex}: ${test.name}`
        }
        console.log(consoleText)

        this.apiRequest(opts, (err, res, body) => {
          if (err)
            cb(err);

          // validate results
          let testResult = {name: test.name, index: test.testIndex};

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

          cb(null, testResult);
        });
      };
    });
  }
}

module.exports = RESTManager;
