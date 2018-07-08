import test, { GenericTestContext, Context } from 'ava';
import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import * as path from 'path';
import { IOUtil } from '../../src/lib/IOUtil';
import { IgnoreKeys } from '../../src/lib/assertionModifications/IgnoreKeys';
import { ITUtil } from './ITUtil';
import * as http from 'http';
import { resolve } from 'url';
const busybee = path.join(__dirname, '../../dist/src/index.js');

/**
 * .serial modifier will force this test to run by itself. need this since we check for specific ports to be used
 * in the response.
 */
test.serial(`happy path simple`, (t) => {
  return new Promise((resolve, reject) => {
    let returned = false;
    const testCmd = spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/REST-happy-path-simple')]);
    const expected = [{"testSets":[{"pass":true,"id":"ts1","tests":[{"pass":true,"id":"body assertion","status":{"pass":true,"actual":200},"headers":{"pass":true,"actual":[{"content-type":"application/json"},{"date":"Wed, 04 Jul 2018 15:15:16 GMT"},{"connection":"close"},{"transfer-encoding":"chunked"}],"expected":[]},"body":{"pass":true,"actual":{"hello":"world","object":{"1":"2","arr":[1,3,4],"nested":{"im":"nested","arr":[1,2,3,4]}},"arr":[1,2,3]}},"request":{"json":true,"method":"GET","url":"http://localhost:7777/body-assertion","timeout":30000,"resolveWithFullResponse":true,"simple":false}},{"pass":true,"id":"status assertion","status":{"pass":true,"actual":404},"headers":{"pass":true,"actual":[{"content-type":"application/json"},{"date":"Wed, 04 Jul 2018 15:15:16 GMT"},{"connection":"close"},{"transfer-encoding":"chunked"}],"expected":[]},"body":{"pass":true},"request":{"json":true,"method":"GET","url":"http://localhost:7777/status-assertion","timeout":30000,"resolveWithFullResponse":true,"simple":false}}]}],"pass":true,"type":"REST","id":"Happy Path"}];
    let actual;

    testCmd.stdout.on('data', (data) => {
      let lines = IOUtil.parseDataBuffer(data);
      lines.forEach((l) => {
        if (l.startsWith('RESULTS:')) {
          actual = JSON.parse(l.replace('RESULTS: ', ''));
        }
      })
    });

    testCmd.stderr.on('data', (data) => {
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
        IgnoreKeys.process(['*.testSets.tests.headers.actual.date'], expected, actual);
        t.deepEqual(actual, expected);
        resolve();
      }
    });
  })
});

test(`tests run in order`, async (t) => {
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

  let result = await ITUtil.expectInOrder(testCmd, expected, t);
  t.is(result.length, 0);
});

test(`env start failure`, async (t) => {
  const expected = {
    'BUSYBEE_ERROR detected': 2,
    'Stopping Environment: Env That Will Fail To Start (1)': 1,
    'Stopping Environment: Env That Will Fail To Start (2)': 1,
    'Stopping Environment: Env That Starts Successfully (1)': 1,
    'Stopping Environment: Env That Starts Successfully (2)': 1,
    'Tests finished in': 1
  };

  const testCmd = spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/env-start-failure')]);

  let actual = await ITUtil.analyzeOutputFrequency(testCmd, expected);
  t.deepEqual(actual, expected);
});

/**
 * .serial modifier will force this test to run by itself to ensure ports aren't being reserved. need this since
 * we're asserting specific ports
 */
test(`ports in use`, async (t) => {
  // spin up a service on 7777 to block the port
  const server = http.createServer();
  server.listen(7777);

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
  const childEnv = Object.assign({}, process.env, {BUSYBEE_LOG_LEVEL: 'TRACE'});
  const testCmd = spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/ports-in-use')], {env: childEnv});
  const expected = {
    'TRACE:EnvManager: arePortsInUseByBusybee  | 7777,7778' : 1,
    'TRACE:EnvManager: 7778 is available': 2,
    'TRACE:EnvManager: 7777 is in use': 1,
    'TRACE:EnvManager: ports identified: {"ports":[7778,7779],"portOffset":1}': 1,
    'TRACE:EnvManager: ports identified: {"ports":[7780,7781],"portOffset":3}': 1,
    'INFO:Object: Tests finished in': 1
  };

  let actual = await ITUtil.analyzeOutputFrequency(testCmd, expected);
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


function sleep(ms = 0) {
  return new Promise(r => setTimeout(r, ms));
}
