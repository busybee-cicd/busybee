import * as _async from 'async';
import * as _ from 'lodash';
import {Logger} from '../lib/Logger';
import {RESTClient} from '../lib/RESTClient';
import {SuiteEnvInfo} from "../lib/SuiteEnvInfo";
import {ParsedTestSetConfig} from "../models/config/parsed/ParsedTestSetConfig";
import {RESTTest} from "../models/RESTTest";
import {IncomingMessage} from "http";
import {TestSetResult} from "../models/results/TestSetResult";

// support JSON.stringify on Error objects
if (!('toJSON' in Error.prototype))
Object.defineProperty(Error.prototype, 'toJSON', {
  value: function () {
    var alt = {};

    Object.getOwnPropertyNames(this).forEach(function (key) {
      alt[key] = this[key];
    }, this);

    return alt;
  },
  configurable: true,
  writable: true
});

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


  runRESTApiTestSets(currentEnv: SuiteEnvInfo): Promise<Array<TestSetResult>> {
    // TODO: logic for running TestSets in order
    return new Promise<Array<TestSetResult>>(async (resolve, reject) => {
      this.logger.trace(`runRESTApiTestSets ${currentEnv.suiteID} ${currentEnv.suiteEnvID}`);
      let testSetPromises = _.map(currentEnv.testSets.values(), (testSet: ParsedTestSetConfig) => {
        return this.runRESTApiTestSet(currentEnv, testSet);
      });

      try {
        let testSetResults:Array<TestSetResult> = await Promise.all(testSetPromises);
        resolve(testSetResults);
      } catch (e) {
        this.logger.trace(`runRESTApiTestSets ERROR encountered while running testSetPromises`);
        return reject(e);
      }
    });

  }

  async runRESTApiTestSet(currentEnv: SuiteEnvInfo, testSet: ParsedTestSetConfig): Promise<TestSetResult> {
    this.logger.trace(`runRESTApiTestSet ${currentEnv.ports} ${testSet.id}`);

    return new Promise<TestSetResult>((resolve, reject) => {
      // build api test functions
      if (!testSet.tests) {
        reject(`testSet ${testSet.id} has no tests`);
        return;
      }

      let testFns = this.buildTestTasks(currentEnv, testSet);

      // run api test functions
      this.logger.info(`Running Test Set: ${testSet.id}`);
      if (testSet.description) {
        this.logger.info(`${testSet.description}`);
      }

      _async.series(testFns, (err2, testResults) => {
        // see if any tests failed and mark the set according
        let pass = _.find(testResults, (tr: any) => { return tr.pass === false }) ? false : true;
        let testSetResult = new TestSetResult();
        testSetResult.pass = pass;
        testSetResult.id = testSet.id;
        testSetResult.tests = testResults;

        // let testSetResults = {
        //   pass: pass,
        //   id: testSet.id,
        //   tests: testResults
        // };

        if (err2) {
          this.logger.trace('runRESTApiTestSet ERROR while running tests');
          this.logger.trace(err2);
          reject(err2);
        } else {
          resolve(testSetResult);
        }
      });
    });
  }

  buildTestTasks(currentEnv: SuiteEnvInfo, testSet: ParsedTestSetConfig) {
    this.logger.trace(`RESTSuiteManager:buildTestTasks <testSet> ${currentEnv.ports}`);
    this.logger.trace(testSet);
    // filter out any tests that do no contain a request object (usually the case if a

    let testsWithARequest = _.reject(testSet.tests, (test:RESTTest) => { return test === null; });
    return _.map(testsWithARequest, (test: RESTTest) => {

      return (cb) => {
        // build request
        let port = currentEnv.ports[0]; // the REST api port should be passed first in the userConfigFile.
        let opts = this.restClient.buildRequest(test.request, port);
        this.logger.trace(opts);

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

        this.logger.info(`${testSet.id}: ${testIndex}: ${test.id}`)
        this.restClient.makeRequest(opts, (err: Error, res: IncomingMessage, body: any) => {
          if (err) { return cb(err); }

          this.validateTestResult(test, Object.assign({}, this.restClient.getDefaultRequestOpts(), opts), res, body, cb)
        });
      };
    });
  }


  validateTestResult(test: RESTTest, reqOpts: any, res: IncomingMessage, body: any, cb: Function) {
    this.logger.trace(`validateTestResult`)
    // validate results
    let testResult = <any>{
      id: test.id,
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

      let statusPass = res.statusCode == test.expect.status;
      if (!statusPass) {
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

      let bodyPass = true;
      let customFnErr = null;
      if (_.isFunction(test.expect.body)) {
        // if the test has a custom function for assertion, run it.
        try {
          bodyPass = test.expect.body(body);
          if (!_.isBoolean(bodyPass)) { // confirm that the assertion returns a bool
            bodyPass = false;
          }
        } catch (e) {
          bodyPass = false;
          customFnErr = {
            type: 'customer validation function',
            error: e
          }

          this.logger.error(customFnErr);
        }
      } else {
        // assert the body against the provided pojo body
        bodyPass = _.isEqual(body, test.expect.body);
      }

      if (!bodyPass) {
        testResult.pass = false;
        testResult.body.pass = false;
        testResult.body.actual = body;
        testResult.body.expected = _.isFunction(test.expect.body) ? customFnErr : test.expect.body;
      }
    }

    // attach the request info if the test itself failed
    if (!testResult.pass) {
      testResult.request = reqOpts;
    }

    cb(null, testResult);
  }
}
