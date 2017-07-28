const request = require('request');
const _async = require('async');
const _ = require('lodash');

class ApiManager {
  constructor(conf) {
    this.conf = conf;
    this.apiRequest = request.defaults(conf.defaultRequestOpts || {});
  }

  buildBaseUrl(port) {
    let conf = this.conf;
    let url = conf.apiHost;
    if (port)
      url += `:${port}`;
    if (conf.apiRoot)
      url += conf.apiRoot;

    return url;
  }

  buildTestUrl(test, port) {
    let url = this.buildBaseUrl(port);
    if (test.request.endpoint)
      url += test.request.endpoint

    return url;
  }

  confirmHealthcheck(port, envId) {
    if (this.conf.debug) {
      console.log(`confirmHealthcheck ${port} ${envId}`);
    }

    return new Promise((resolve, reject) => {
      let conf = this.conf;
      if (!conf.healthcheck) {
        console.log("No Healthcheck endpoint provided. Moving on.")
        resolve();
      }

      let url = this.buildBaseUrl(port);
      let opts = {
        url: `${url}${conf.healthcheck.endpoint}`
      };

      if (conf.healthcheck.query)
        opts = Object.assign({}, opts, {qs: conf.healthcheck.query});

      // retries the healthcheck endpoint every 3 seconds up to 20 times
      // when successful calls the cb passed to confirmHealthcheck()
      if (this.conf.debug) {
        console.log("Healthcheck request Opts:");
        console.log(opts);
      }

      _async.retry({times: 20, interval: 5000},
        (asyncCb) => {
          console.log(`Attempting healthcheck for stack-${envId}...`);
          this.apiRequest(opts, (err, res, body) => {
            if (err) {
              asyncCb("failed");
              return
            }

            if (res && res.statusCode === 200) {
              console.log("Healthcheck Confirmed!");
              asyncCb(null, true);
            } else {
              asyncCb("failed");
            }
          })
        }
        , (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
    });
  }

  buildApiTestTasks(testSet, port) {
    return testSet.tests.map((test, i) => {
      /**
       Move all dis to apiManager
      */
      return (cb) => {
        if (!test.request) {
          console.log(`testSet ${testSet.name}:${test.name} contains no request information`);
          cb(null);
        }

        // build request
        let opts = {
          url: this.buildTestUrl(test, port),
          method: test.request.method
        };

        // allow users to specify request opts per call
        if (test.request.requestOpts)
          opts = Object.assign({}, opts, test.request.requestOpts);

        if (test.request.body)
          opts = Object.assign({}, opts, {body: test.request.body});

        if (test.request.query)
          opts = Object.assign({}, opts, {qs: test.request.query});

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

module.exports = ApiManager;
