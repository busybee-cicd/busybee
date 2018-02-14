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

            _async.series(testFns, (err2, testResults) => {
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
        // filter out any tests that do no contain a request object (usually the case if a
        
        if (testSet.testsUnordered.length > 0) {
            // ADD ORDERED AND UNORDERED ARRAYS TOGETHER
            testSet.tests = testSet.tests.concat(testSet.testsUnordered);
        }

        let testsWithARequest = _.reject(testSet.tests, (test: RESTTest) => {
            return test === null;
        });
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
                    }
                    ;

                }

                this.logger.info(`${testSet.id}: ${testIndex}: ${test.id}`)
                this.restClient.makeRequest(opts, (err: Error, res: IncomingMessage, body: any) => {
                    if (err) {
                        return cb(err);
                    }

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


            ///////////////////////////
            //  Run Assertions
            ///////////////////////////
            try {
                //  Assertion Modifications
                /*
                 there are some assertion modifications that should alter the actual/expect prior to running an
                 assertion function or doing a direct pojo comparision. run those here
                 */
                let expected;
                let actual = _.isArray(body) ? body.slice() : Object.assign({}, body);
                if (_.isFunction(test.expect.body)) {
                    /*
                     In the event that 'expect.body' is a custom fn, we'll make 'expected' == 'actual'
                     This will allow the assertionModification fn's to run without blowing up since they mutate both
                     'expected and 'actual'. Ultimately, when the assertions are run the 'expected' object set here will not
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
                        UnorderedCollections.process(test.expect.assertionModifications.unorderedCollections, expected, actual)
                    }
                }
                // /End Assertion Modifications

                // Run Custom Function Assertion OR basic Pojo comparision
                if (_.isFunction(test.expect.body)) {
                    // if the test has a custom function for assertion, run it.
                    let bodyResult = test.expect.body(actual);
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
                    error: e
                };

                this.logger.error(customFnErr);
            }

            // if (_.isFunction(test.expect.body)) {
            //     // if the test has a custom function for assertion, run it.
            //     try {
            //         let bodyResult = test.expect.body(actual);
            //         if (bodyResult === false) {
            //             bodyPass = false;
            //         } // else we pass it. ie) it doesn't return anything we assume it passed.
            //     } catch (e) {
            //         bodyPass = false;
            //         customFnErr = {
            //             type: 'custom validation function',
            //             error: e
            //         };
            //
            //         this.logger.error(customFnErr);
            //     }
            // } else {
            //     // assert the body against the provided pojo body
            //     bodyPass = _.isEqual(expected, actual);
            // }

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
