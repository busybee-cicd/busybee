import test from 'ava';
import { spawn } from 'child_process';
import * as path from 'path';
import { IgnoreKeys } from '../../src/lib/assertionModifications/IgnoreKeys';
import { ITUtil } from './util/ITUtil';
import * as http from 'http';
import * as request from 'request-promise';
import { Logger, IOUtil, LoggerConf } from 'busybee-util';
const _request = request.defaults({
  json:true,
  simple: false,
  resolveWithFullResponse: true,
  proxy: false
});
const busybee = path.join(__dirname, '../../dist/src/index.js');
const loggerClazz = { constructor: { name: 'ITRunner' } }; // hack to get the logger to prepend something meaningful in debug mode
process.env['NO_PROXY'] = 'localhost,127.0.0.1';

/**
 * .serial modifier will force this test to run by itself. need this since we check for specific ports to be used
 * in the response.
 */
test.serial(`REST happy path`, (t) => {
  const loggerConf = new LoggerConf(loggerClazz, process.env.LOG_LEVEL, t.log.bind(t));
  const logger = new Logger(loggerConf);

  return new Promise((resolve, reject) => {
    let returned = false;
    const testCmd = spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/REST-happy-path')]);
    const expected = {"runId":"82148fd0-a709-11e8-9c57-3b02ed94a9b8","runTimestamp":1535051991373,"data":[{"testSets":[{"pass":true,"id":"ts1","tests":[{"pass":true,"id":"body assertion","body":{"pass":true,"actual":{"hello":"world","object":{"1":"2","arr":[1,3,4],"nested":{"im":"nested","arr":[1,2,3,4]}},"arr":[1,2,3]}},"request":{"json":true,"resolveWithFullResponse":true,"simple":false,"method":"GET","url":"http://localhost:7777/body-assertion","timeout":30000}},{"pass":true,"id":"status assertion","status":{"pass":true,"actual":404},"request":{"json":true,"resolveWithFullResponse":true,"simple":false,"method":"GET","url":"http://localhost:7777/status-assertion","timeout":30000}}]}],"pass":true,"type":"REST","id":"REST Happy Path"}]};
    let actual;

    testCmd.stdout.on('data', (data) => {
      let lines = IOUtil.parseDataBuffer(data);
      lines.forEach((l) => {
        if (l.startsWith('RESULTS:')) {
          actual = JSON.parse(l.replace('RESULTS: ', ''));
        }
      })
    });

    testCmd.stderr.on('data', () => {
      if (!returned) {
        returned = true;
        t.fail();
        testCmd.kill('SIGHUP');
        resolve();
      }
    });

    testCmd.on('close', () => {
      if (!returned) {
        returned = true;
        // remove the nested 'date' property from actual/expected since this will be different each run
        t.deepEqual(actual.data, expected.data);
        resolve();
      }
    });
  });
});

test(`tests run in order`, async (t) => {
  const loggerConf = new LoggerConf(loggerClazz, process.env.LOG_LEVEL, t.log.bind(t));
  const logger = new Logger(loggerConf);
  const testCmd = spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/REST-tests-run-in-order')]);
  const expected = [
    'INFO: Running Test Set: ts1',
    'INFO: ts1: 0: test at index: 0',
    'INFO: ts1: 1: test at index: 1',
    'INFO: ts1: 2: test at index: 2',
    'INFO: ts1: 3: test at index: 3',
    'INFO: ts1: 4: test at index: 4',
    'INFO: ts1: #: implicitly ordered 1',
    'INFO: ts1: #: implicitly ordered 2',
    'INFO: ts1: #: implicitly ordered 3'
  ];

  let result = await ITUtil.expectInOrder(testCmd, expected, t, false, logger);
  t.is(result.length, 0);
});

// TODO: re-write now that we have retries
test(`env start failure`, async (t) => {
  const loggerConf = new LoggerConf(loggerClazz, process.env.LOG_LEVEL, t.log.bind(t));
  const logger = new Logger(loggerConf);
  const expected = {
    'BUSYBEE_ERROR detected': 4,
    'Stopping Environment: Env That Will Fail To Start': 4, // stop() is called each time it fails to start. first failure + 3 retries.
    'Stopping Environment: Env That Starts Successfully': 1,
    'Restart attempt number': 3,
    'Tests finished in': 1
  };

  const testCmd = spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/env-start-failure')]);

  let actual = await ITUtil.analyzeOutputFrequency(testCmd, expected, logger);
  t.deepEqual(actual, expected);
});

/**
 * .serial modifier will force this test to run by itself to ensure ports aren't being reserved. need this since
 * we're asserting specific ports
 */
test(`ports in use`, async (t) => {
  const loggerConf = new LoggerConf(loggerClazz, process.env.LOG_LEVEL, t.log.bind(t));
  const logger = new Logger(loggerConf);
  // spin up a service on 7777 to block the port
  const server = http.createServer();
  server.listen(8888);

  // wait for service to begin listening
  await new Promise((resolve, reject) => {
    server.on('listening', async () => {
      resolve();
    });

    server.on('error', (err) => {
      reject(err);
    });
  });

  // spin up busybee and assert output
  const childEnv = Object.assign({}, process.env, {LOG_LEVEL: 'TRACE'});
  const testCmd = spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/ports-in-use')], {env: childEnv});
  const expected = {
    'TRACE:EnvManager: arePortsInUseByBusybee  | 8888,8889' : 1,
    'TRACE:EnvManager: 8889 is available': 2,
    'TRACE:EnvManager: 8888 is in use': 1,
    'TRACE:EnvManager: ports identified: {"ports":[8889,8890],"portOffset":1}': 1,
    'TRACE:EnvManager: ports identified: {"ports":[8891,8892],"portOffset":3}': 1,
    'INFO:Object: Tests finished in': 1
  };

  let actual = await ITUtil.analyzeOutputFrequency(testCmd, expected, logger);
  t.deepEqual(actual, expected);

  // shut down server holding 7777
  await new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    })
  });
});

/**
 *
 */
test(`USER_PROVIDED happy path`, async (t) => {
  const loggerConf = new LoggerConf(loggerClazz, process.env.LOG_LEVEL, t.log.bind(t));
  const logger = new Logger(loggerConf);
  const childEnv = Object.assign({}, process.env, {MY_ENV_VAR: 'MY_ENV_VAR Was Passed to run.sh'});
  const testCmd = spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/USER_PROVIDED-happy-path'), '-D'], {env: childEnv});
  const expected = [
    'DEBUG:EnvManager: startData is neat',
    'DEBUG:EnvManager: MY_ENV_VAR Was Passed to run.sh',
    'DEBUG:EnvManager: runData rules',
    'DEBUG:EnvManager: stopData is also neat'
  ];
  const result = await ITUtil.expectInOrder(testCmd, expected, t, false, logger);

  t.is(result.length, 0);
});

/**
 * tests that mock behavior is working properly
 */
test(`REST mock mode`, async (t) => {
  const loggerConf = new LoggerConf(loggerClazz, process.env.LOG_LEVEL, t.log.bind(t));
  const logger = new Logger(loggerConf);
  const testCmd = spawn(busybee, ['mock', '-d', path.join(__dirname, 'fixtures/REST-mock-mode'), '--testSuite', 'REST Mock Mode']);
  // confirm start-up
  await ITUtil.waitFor(testCmd, 'INFO: Mock Server listening on 3030', t, false, logger);
  //await ITUtil.waitFor(testCmd, 'forever', t, false, logger);

  /*
    1. check that a test with multiple mocks will iterate
    between them on subsequent calls
  */
  let uri = 'http://localhost:3030/body-assertion';
  try {
    let okRes = await _request({uri: uri});
    t.is(okRes.statusCode, 200);
    t.deepEqual(okRes.body, {hello: 'world'});

    let failRes = await _request({uri: uri});
    t.is(failRes.statusCode, 500);
  } catch (e) {
    t.fail(e.message);
  }

  /*
    2. check that an explicitly defined mock can be called separately
    for the same endpoint using the busybee-mock-status header
  */
  try {
    // call the uri without busybee-mock-status header and should get 200
    let okRes = await _request({uri: uri});
    t.is(okRes.statusCode, 200);
    t.deepEqual(okRes.body, {hello: 'world'});

    // explicitly request a 404 status
    let notFoundRes = await _request({uri: uri, headers: {'busybee-mock-status': 404}});
    t.is(notFoundRes.statusCode, 404);
  } catch (e) {
    t.fail(e.message);
  }

  testCmd.kill('SIGHUP');
});

test(`REST variable exports`, async (t) => {
  const loggerConf = new LoggerConf(loggerClazz, process.env.LOG_LEVEL, t.log.bind(t));
  const logger = new Logger(loggerConf);
  const expected = ['Test Passed?: true'];

  //const childEnv = Object.assign({}, process.env, {LOG_LEVEL: 'TRACE'});
  const testCmd = spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/REST-variable-exports')]);

  let result = await ITUtil.expectInOrder(testCmd, expected, t, false, logger);
  t.is(result.length, 0);
});


// function sleep(ms = 0) {
//   return new Promise(r => setTimeout(r, ms));
// }
