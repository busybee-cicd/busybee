import * as _async from 'async';
import * as _ from 'lodash';
import {Logger} from '../lib/Logger';
import {RESTClient} from '../lib/RESTClient';
import {SuiteEnvInfo} from "../lib/SuiteEnvInfo";
import {ParsedTestSetConfig} from "../models/config/parsed/ParsedTestSetConfig";
import {RESTTest} from "../models/RESTTest";
import {IncomingMessage} from "http";
import {TestSetResult} from "../models/results/TestSetResult";
import {IgnoreKeys} from "../lib/assertionModifications/IgnoreKeys";
import {UnorderedCollections} from "../lib/assertionModifications/UnorderedCollections";
import {RESTTestPartResult} from "../models/results/RESTTestPartResult";
import {RESTTestHeaderResult} from "../models/results/RESTTestHeaderResult";
import {RESTTestResult} from "../models/results/RESTTestResult";
import {TestSetConfig} from "../models/config/user/TestSetConfig";
import {DeleteCollections} from "../lib/assertionModifications/DeleteCollections";
import {BusybeeParsedConfig} from "../models/config/BusybeeParsedConfig";
import {ParsedTestEnvConfig} from "../models/config/parsed/ParsedTestEnvConfig";

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

  private conf: BusybeeParsedConfig;
  private logger: Logger;
  private restClient: RESTClient;

  constructor(conf: BusybeeParsedConfig, suiteEnvConf: SuiteEnvInfo) {
    this.conf = _.cloneDeep(conf);
    this.logger = new Logger(conf, this);
    this.restClient = new RESTClient(conf, suiteEnvConf);
  }

  ///////// TestRunning


  runRESTApiTestSets(currentEnv: SuiteEnvInfo): Promise<Array<TestSetResult>> {
    // TODO: logic for running TestSets in order
    return new Promise<Array<TestSetResult>>(async(resolve, reject) => {
      this.logger.trace(`runRESTApiTestSets ${currentEnv.suiteID} ${currentEnv.suiteEnvID}`);
      let testSetPromises = _.map(currentEnv.testSets.values(), (testSet: ParsedTestSetConfig) => {
        return this.runRESTApiTestSet(currentEnv, testSet);
      });

      try {
        let testSetResults: Array<TestSetResult> = await Promise.all(testSetPromises);
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

      let controlFlow = testSet.controlFlow || `series`;
      this.logger.debug(`${testSet.id}: controlFlow = ${controlFlow}`);
      _async[controlFlow](testFns, (err2: Error, testResults: Array<RESTTestResult>) => {
        // see if any tests failed and mark the set according
        let pass = _.find(testResults, (tr: any) => {
          return tr.pass === false
        }) ? false : true;

        let testSetResult = new TestSetResult();
        testSetResult.pass = pass;
        testSetResult.id = testSet.id;
        testSetResult.tests = testResults;

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

    // filter out tests that do not contain .request object (shouldnt be required anymore) TODO: remove?
    let testsWithARequest = _.reject(testSet.tests, (test: RESTTest) => {
      if (_.isNil(test)) {
        this.logger.trace("TestSet with NULL test detected");
      }
      return _.isNil(test);
    });
    return _.map(testsWithARequest, (test: RESTTest) => {

      return async(cb) => {
        // build request
        let port = currentEnv.ports[0]; // the REST api port should be passed first in the userConfigFile.
        let opts = this.restClient.buildRequest(test.request, port);
        // filter everything in the request opts for variables that should be set via variableExports
        this.logger.trace('opts before processRequestOptsForVariableDeclarations');
        this.logger.trace(opts);
        opts = this.processRequestOptsForVariableDeclarations(opts, testSet.variableExports);
        this.logger.trace('opts after processRequestOptsForVariableDeclarations');
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
          }
          ;

        }


        this.logger.info(`${testSet.id}: ${testIndex}: ${test.id}`);
        if (test.delayRequest) {
          this.logger.info(`Delaying request for ${test.delayRequest / 1000} seconds.`);
          await this.wait(test.delayRequest);
        }

        try {
          let response = await this.restClient.makeRequest(opts);
          this.validateTestResult(testSet, test, Object.assign({}, this.restClient.getDefaultRequestOpts(), opts), response, cb);
        } catch (err) {
          this.logger.error(err, true);
          let testResult = new RESTTestResult(test.id);
          testResult.pass = false;
          testResult.body.pass = false;
          testResult.body.error = {
            type: 'error during request',
            error: err.message,
            stack: err.stack
          }
          testResult.headers.pass = false;
          testResult.status.pass = false;

          return cb(null, testResult);
        }
      };
    });
  }

  wait(milliseconds) {
    return new Promise((resolve, reject) => setTimeout(resolve, milliseconds))
  }

  /*
   Iterates through the request opts and relaces all instances of #{myVar}
   with properties of the same name on variableExports
   */
  processRequestOptsForVariableDeclarations(opts: any, variableExports: any): any {
    // check url
    opts.url = this.replaceVars(opts.url, variableExports);
    let objBasedPropsToCheck = ['qs', 'headers', 'body'];
    objBasedPropsToCheck.forEach(prop => {
      if (opts[prop]) {
        opts[prop] = this.replaceVarsInObject(opts[prop], variableExports);
      }
    })

    return opts;
  }

  replaceVarsInObject(obj: any, variableExports: any) {
    if (_.isString(obj)) {
      return this.replaceVars(obj, variableExports);
    }

    _.forEach(obj, (value, propName) => {
      if (_.isObject(value) && !_.isArray(value)) {
        obj[propName] = this.replaceVarsInObject(value, variableExports);
      } else if (_.isArray(value)) {
        obj[propName] = value.map(v => {
          return this.replaceVarsInObject(v, variableExports);
        });
      } else if (_.isString(value)) {
        obj[propName] = this.replaceVars(value, variableExports);
      }
    });

    return obj;
  }

  /*
   Parses strings formatted as "#{myVar}"
   */
  replaceVars(str: string, variableExports: any) {
    // When the string startsWith #{ and endswith }
    // we assume its a literal substitution.
    if (str.startsWith(`#{`) && str.endsWith(`}`)) {
      let varName = str.substr(2).slice(0, -1);
      this.logger.trace(`Setting literal ${variableExports[varName]} for '${varName}'`);
      return variableExports[varName];
    }

    let replaced = str.replace(/#{\w+}/g, (match) => {
      match = match.substr(2).slice(0, -1); // remove #{}
      this.logger.trace(`Setting ${match} for '${str}'`);
      this.logger.trace(variableExports, true);
      if (_.isObject(variableExports[match])) {
        // if the matched variable's value is an object
        // we return a special instruction
        return `OBJECT-${match}`;
      }
      return variableExports[match];
    });


    if (replaced.startsWith("OBJECT")) {
      let key = replaced.substr(7);
      replaced = variableExports[key];
    }

    return replaced;
  }


  validateTestResult(testSet: ParsedTestSetConfig, test: RESTTest, reqOpts: any, res, cb: (Error, RESTTestResult?) => {}) {
    this.logger.trace(`validateTestResult`);

    // validate results
    let testResult = new RESTTestResult(test.id);

    if (test.expect.status) {
      let statusPass = res.statusCode == test.expect.status;
      testResult.status.actual = res.statusCode;

      if (!statusPass) {
        testResult.pass = false;
        testResult.status.pass = false;
        testResult.status.expected = test.expect.status;
      }
    } else {
      // return the actual status by default
      testResult.status.actual = res.statusCode;
    }

    if (test.expect.headers) {
      _.forEach(test.expect.headers, (v, headerName) => {
        if (res.headers[headerName] != v) {
          testResult.pass = false;
          testResult.headers.pass = false;
        }

        let actual = {};
        actual[headerName] = res.headers[headerName];
        testResult.headers.actual.push(actual);
        let expected = {};
        expected[headerName] = v;
        testResult.headers.expected.push(expected);
      });
    } else {
      // return the actual headers by default
      _.forEach(res.headers, (v, headerName) => {
        let actual = {};
        actual[headerName] = v;
        testResult.headers.actual.push(actual);
      });
    }

    if (test.expect.body) {
      let bodyPass = true;
      let customFnErr = null;


      ///////////////////////////
      //  Run Assertions
      ///////////////////////////

      let actual = _.cloneDeep(res.body);
      let expected;
      try {
        //  Assertion Modifications

        /*
         there are some assertion modifications that should alter the actual/expect prior to running an
         assertion function or doing a direct pojo comparision. run those here
         */
        if (_.isFunction(test.expect.body)) {
          /*
           In the event that 'expect.body' is a custom fn, we'll make 'expected' == 'actual'
           assertionModification logic relies on 'expected' and 'actual' to both be objects.
           Ultimately, when the assertions are run the 'expected' object set here will not
           be used and instead 'test.expect.body(actual)' will be evaluated.
           */
          expected = _.cloneDeep(actual);
        } else {
          expected = _.cloneDeep(test.expect.body);
        }

        if (test.expect.assertionModifications) {
          testResult.assertionModifications = test.expect.assertionModifications;

          if (test.expect.assertionModifications.ignoreKeys) {
            IgnoreKeys.process(test.expect.assertionModifications.ignoreKeys, expected, actual);
          }

          if (test.expect.assertionModifications.unorderedCollections) {
            this.logger.debug(`Processing UnorderedCollections`);
            /*
             Due to the scenario where unorderedCollections may contain unorderedCollections ie)
             [
             {
             subCollection: [1,2,3,4]
             },
             {
             subCollection: [5,6,7,8]
             }
             ]

             We must do a first pass where we work from the outside -> in. We just check for equality while ignoring nested collections.
             On a second pass we remove the collections so that they don't appear in the body-assertion steps below
             */
            UnorderedCollections.process(test.expect.assertionModifications.unorderedCollections, expected, actual);
          }
        }
        // /End Assertion Modifications

        // IMPORTANT: the 'expected' and 'actual' at this point have been modified to remove anything that we should ignore.
        // that is so that keys that don't matter aren't passed to the assertionFn or the _.isEqual

        // Run Custom Function Assertion OR basic Pojo comparision
        if (_.isFunction(test.expect.body)) {
          // if the test has a custom function for assertion, run it.
          let bodyResult = test.expect.body(actual, testSet.variableExports);
          if (bodyResult === false) {
            bodyPass = false;
          } // else we pass it. ie) it doesn't return anything we assume it passed.
        } else {
          // substitue any exported variable referenced from previous tests
          if (!_.isEmpty(testSet.variableExports)) {
            this.replaceVarsInObject(expected, testSet.variableExports);
          }
          // assert the body against the provided pojo body
          bodyPass = _.isEqual(expected, actual);
        }
      } catch (e) {
        bodyPass = false;
        customFnErr = {
          type: 'custom validation function',
          error: e.message,
          stack: e.stack
        };
      }

      // actual and expected should return the original info, not mutated by assertionModifications
      testResult.body.actual = actual; // original returned body is never mutated
      if (!bodyPass) {
        testResult.pass = false;
        testResult.body.pass = false;
        testResult.body.expected = expected;
        if (customFnErr) {
          testResult.body.error = customFnErr;
        }
      }
    } else {
      // just return the body that was returned and consider it a pass
      testResult.body.actual = _.cloneDeep(res.body);
    }

    // attach the request info for reporting purposes
    testResult.request = reqOpts;

    cb(null, testResult);
  }

}
