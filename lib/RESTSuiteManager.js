let request = require('request');
const _async = require('async');
const _ = require('lodash');
const Logger = require('./logger');
const RESTClient = require('./RESTClient');

class RESTSuiteManager {
  constructor(conf, suiteEnvConf) {
    this.conf = conf;
    this.logger = new Logger(conf, this);
    this.suiteEnvConf = suiteEnvConf;
    this.restClient = new RESTClient(conf, suiteEnvConf);
  }

  ///////// TestRunning

  runRESTApiTestSets(currentEnv, restManager) {
    // TODO: logic for running TestSets in order
    return new Promise(async (resolve, reject) => {
      this.logger.debug(`runRESTApiTestSets ${currentEnv.suiteID} ${currentEnv.suiteEnvID}`);
      let testSetPromises = _.map(currentEnv.testSets, (testSet, id) => {
        return this.runRESTApiTestSet(currentEnv, testSet, restManager);
      });

      let testSetResults;
      let testSetErr;
      try {
        testSetResults = await Promise.all(testSetPromises);
      } catch (e) {
        testSetErr = e;
      }

      if (testSetErr) {
        this.logger.debug(`runRESTApiTestSets ERROR encountered while running testSetPromises`);
        reject(testSetErr);
      } else {
        resolve(testSetResults);
      }
    });

  }

  async runRESTApiTestSet(currentEnv, testSet, restManager) {
    this.logger.debug(`runRESTApiTestSet ${currentEnv.ports} ${testSet.id}`);

    return new Promise((resolve, reject) => {
      // build api test functions
      if (!testSet.tests) {
        reject(`testSet ${testSet.id} has no tests`);
      }

      let testFns = this.buildTestTasks(testSet, currentEnv);

      // run api test functions
      this.logger.info(`Running Test Set: ${testSet.id}`);
      if (testSet.description) {
        this.logger.info(`${testSet.description}`);
      }

      let flow = this.conf['controlFlow'] || 'parallel';
      _async[flow](testFns, (err2, testResults) => {
        // pass test results
        let testSetResults = {
          name: testSet.id,
          results: testResults
        };

        if (err2) {
          this.logger.debug('runRESTApiTestSet ERROR while running tests');
          this.logger.debug(err2);
          reject(err2);
        } else {
          resolve(testSetResults);
        }
      });
    });
  }

  buildTestTasks(testSet, currentEnv) {
    this.logger.debug(`RESTSuiteManager:buildTestTasks <testSet> ${currentEnv.ports}`);
    this.logger.debug(testSet);
    return testSet.tests.map((test, i) => {

      return (cb) => {
        if (!test.request) {
          this.logger.info(`testSet ${testSet.id}:${test.name} contains no request information. Probably a placeholder due to indexing.`);
          return cb(null);
        }
        if (test.skip || test.mock) {
          return cb(null);
        }

        // build request
        let port = currentEnv.ports[0]; // the REST api port should be passed first in the config.
        let opts = this.restClient.buildRequest(test.request, port);
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

        this.restClient.makeRequest(opts, (err, res, body) => {
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

module.exports = RESTSuiteManager;
