import * as _async from 'async';
import * as _ from 'lodash';
import {Logger} from '../lib/Logger';
import {RESTClient} from '../lib/RESTClient';
import {SuiteEnvInfo} from "../lib/SuiteEnvInfo";
import {ParsedTestSetConfig} from "../config/parsed/ParsedTestSetConfig";
import {RESTTest} from "../config/test/RESTTest";
import {IncomingMessage} from "http";

export class RESTSuiteManager {

  private conf: any;
  private logger: Logger;
  private restClient: any;

  constructor(conf, suiteEnvConf) {
    this.conf = conf;
    this.logger = new Logger(conf, this);
    this.restClient = new RESTClient(conf, suiteEnvConf);
  }

  ///////// TestRunning


  runRESTApiTestSets(currentEnv: SuiteEnvInfo) {
    // TODO: logic for running TestSets in order
    return new Promise(async (resolve, reject) => {
      this.logger.debug(`runRESTApiTestSets ${currentEnv.suiteID} ${currentEnv.suiteEnvID}`);
      let testSetPromises = _.map(currentEnv.testSets.values(), (testSet: ParsedTestSetConfig) => {
        return this.runRESTApiTestSet(currentEnv, testSet);
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

  async runRESTApiTestSet(currentEnv: SuiteEnvInfo, testSet: ParsedTestSetConfig) {
    this.logger.debug(`runRESTApiTestSet ${currentEnv.ports} ${testSet.id}`);

    return new Promise((resolve, reject) => {
      // build api test functions
      if (!testSet.tests) {
        reject(`testSet ${testSet.id} has no tests`);
      }

      let testFns = this.buildTestTasks(currentEnv, testSet);

      // run api test functions
      this.logger.info(`Running Test Set: ${testSet.id}`);
      if (testSet.description) {
        this.logger.info(`${testSet.description}`);
      }

      let flow = this.conf.controlFlow || 'parallel';
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

  buildTestTasks(currentEnv: SuiteEnvInfo, testSet: ParsedTestSetConfig) {
    this.logger.debug(`RESTSuiteManager:buildTestTasks <testSet> ${currentEnv.ports}`);
    this.logger.debug(testSet);
    return testSet.tests.map((test: RESTTest, i) => {

      return (cb) => {
        if (!test.request) {
          this.logger.info(`testSet ${testSet.id}:${test.name} contains no request information. Probably a placeholder due to indexing.`);
          return cb();
        }

        // build request
        let port = currentEnv.ports[0]; // the REST api port should be passed first in the userConfigFile.
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

        this.restClient.makeRequest(opts, (err: Error, res: IncomingMessage, body: any) => {
          if (err) { return cb(err); }

          this.validateTestResult(test, res, body, cb)
        });
      };
    });
  }


  validateTestResult(test: RESTTest, res: IncomingMessage, body: any, cb: Function) {
    this.logger.debug(`validateTestResult`)
    // validate results
    let testResult = <any>{
      name: test.name,
      index: test.testIndex,
      pass: true
    };


    if (test.expect.headers) {
      testResult.headers = []

      _.forEach(test.expect.headers, (v, headerName) => {
        if (res.headers[headerName] != v) {
          testResult.pass = false;
          testResult.headers.push({
            pass: false,
            headerName: headerName,
            actual: res.headers[headerName],
            expected: v
          });
          testResult.headers[headerName] = `Expected ${v} was ${res.headers[headerName]}`;
        } else {
          testResult.headers.push({
            pass: true,
            headerName: headerName
          })
        }
      });
    }


    if (test.expect.status) {
      testResult.status = {
        pass: true
      }

      let verdict = res.statusCode == test.expect.status;
      if (!verdict) {
        testResult.pass = false;
        testResult.status.pass = false;
        testResult.status.actual = res.statusCode;
        testResult.status.expected = test.expect.status;
      }
    }

    if (test.expect.body) {
      testResult.body = {
        pass: true
      }

      let verdict;
      if (_.isFunction(test.expect.body)) {
        // if the test has a custom function for assertion, run it.
        try {
          verdict = test.expect.body(body);
          if (!_.isBoolean(verdict)) { // confirm that the assertion returns a bool
            verdict = false;
          }
        } catch (e) {
          verdict = false;
        }
      } else {
        // assert the body against the provided pojo body
        verdict = _.isEqual(body, test.expect.body);
      }

      if (!verdict) {
        testResult.pass = false;
        testResult.body.pass = false;
        testResult.body.actual = body;
        testResult.body.expected = _.isFunction(body) ? 'custom assertion function' : test.expect.body;
      }
    }

    cb(null, testResult);
  }
}
