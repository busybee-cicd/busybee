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
            if (testSet.id == 'asset management') {
                this.logger.debug(testSet.tests, true);
            }

            if (testSet.description) {
                this.logger.info(`${testSet.description}`);
            }

            _async.series(testFns, (err2: Error, testResults: Array<RESTTestResult>) => {
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
            return test === null;
        });
        return _.map(testsWithARequest, (test: RESTTest) => {

            return (cb) => {
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

                this.logger.info(`${testSet.id}: ${testIndex}: ${test.id}`)
                this.restClient.makeRequest(opts, (err: Error, res: IncomingMessage, body: any) => {
                    if (err) {
                        return cb(err);
                    }

                    this.validateTestResult(testSet, test, Object.assign({}, this.restClient.getDefaultRequestOpts(), opts), res, body, cb)
                });
            };
        });
    }

    processRequestOptsForVariableDeclarations(opts: any, variableExports: any) {
        // check url
        opts.url = this.replaceVars(opts.url, variableExports);
        let objBasedPropsToCheck = ['query', 'headers', 'body'];
        objBasedPropsToCheck.forEach(prop => {
            if (opts[prop]) {
                opts[prop] = this.replaceVarsInObject(opts[prop], variableExports);
            }
        })

        return opts;
    }

    replaceVarsInObject(obj: any, variableExports: any) {
        _.forEach(obj, (value, propName) => {
           if (_.isObject(value) && !_.isArray(value)) {
               obj[propName] = this.replaceVarsInObject(value, variableExports);
           } else if (_.isString(value)) {
               obj[propName] = this.replaceVars(value, variableExports);
           }
        });

        return obj;
    }

    replaceVars(str:string, variableExports: any) {
        let newStr = str.replace(/#{\w+}/g, (match) => {
            match = match.substr(2); // remove #{
            match = match.slice(0,-1); // remove }
            this.logger.trace(`Setting ${match} for '${str}'`);
            this.logger.trace(variableExports, true);
            return variableExports[match];
        });

        return newStr;
    }


    validateTestResult(testSet: ParsedTestSetConfig, test: RESTTest, reqOpts: any, res: IncomingMessage, body: any, cb: (Error, RESTTestResult?) => {}) {
        this.logger.trace(`validateTestResult`)
        // validate results
        let testResult = new RESTTestResult(test.id, test.testIndex);

        if (test.expect.headers) {
            testResult.headers = new RESTTestHeaderResult();

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
        }


        if (test.expect.status) {
            testResult.status = new RESTTestPartResult();

            let statusPass = res.statusCode == test.expect.status;
            testResult.status.actual = res.statusCode;

            if (!statusPass) {
                testResult.pass = false;
                testResult.status.pass = false;
                testResult.status.expected = test.expect.status;
            }
        }

        if (test.expect.body) {
            testResult.body = new RESTTestPartResult();

            let bodyPass = true;
            let customFnErr = null;


            ///////////////////////////
            //  Run Assertions
            ///////////////////////////

            let actual = _.isArray(body) ? body.slice() : Object.assign({}, body);
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
                    expected =  _.isArray(actual) ? actual.slice() : Object.assign({}, actual);
                } else {
                    expected = _.isArray(test.expect.body) ? test.expect.body.slice() : Object.assign({}, test.expect.body);
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
                        DeleteCollections.process(test.expect.assertionModifications.unorderedCollections, expected, actual);
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

            testResult.body.actual = actual;
            if (!bodyPass) {
                testResult.pass = false;
                testResult.body.pass = false;
                testResult.body.expected = customFnErr ?  customFnErr : expected;
            }
        }

        // attach the request info for reporting purposes
        testResult.request = reqOpts;

        cb(null, testResult);
    }
}
