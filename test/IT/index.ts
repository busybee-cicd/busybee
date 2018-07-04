import test, { GenericTestContext, Context } from 'ava';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { Logger } from '../../src/lib/Logger';
import { IOHelper } from '../../src/lib/IOHelper';
import { IgnoreKeys } from '../../src/lib/assertionModifications/IgnoreKeys';
const busybee = path.join(__dirname, '../../dist/src/index.js');
const logger = new Logger({}, {constructor : {name: 'IT'}});

test(`happy path simple`, (t) => {
  return new Promise((resolve, reject) => {
    let returned = false;
    const testCmd = spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/REST-happy-path-simple')]);
    const expected = [{"testSets":[{"pass":true,"id":"ts1","tests":[{"pass":true,"id":"body assertion","status":{"pass":true,"actual":200},"headers":{"pass":true,"actual":[{"content-type":"application/json"},{"date":"Wed, 04 Jul 2018 15:15:16 GMT"},{"connection":"close"},{"transfer-encoding":"chunked"}],"expected":[]},"body":{"pass":true,"actual":{"hello":"world","object":{"1":"2","arr":[1,3,4],"nested":{"im":"nested","arr":[1,2,3,4]}},"arr":[1,2,3]}},"request":{"json":true,"method":"GET","url":"http://localhost:7777/body-assertion","timeout":30000,"resolveWithFullResponse":true,"simple":false}},{"pass":true,"id":"status assertion","status":{"pass":true,"actual":404},"headers":{"pass":true,"actual":[{"content-type":"application/json"},{"date":"Wed, 04 Jul 2018 15:15:16 GMT"},{"connection":"close"},{"transfer-encoding":"chunked"}],"expected":[]},"body":{"pass":true},"request":{"json":true,"method":"GET","url":"http://localhost:7777/status-assertion","timeout":30000,"resolveWithFullResponse":true,"simple":false}}]}],"pass":true,"type":"REST","id":"Happy Path"}];
    let actual;

    testCmd.stdout.on('data', (data) => {
      let lines = IOHelper.parseDataBuffer(data);
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

test(`test run order`, async (t) => {
  const testCmd = spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/REST-test-run-order')]);
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

  let result = await expectInOrder(testCmd, expected, t);
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

  let actual = await analyzeOutputFrequency(testCmd, expected);
  t.deepEqual(actual, expected);
});

/*
  looks for occurrences of strings in a stdout stream of a child process
  when given an assertions object {stringToFind: numberOfOccurrences}
*/
function analyzeOutputFrequency(childProc: ChildProcess, assertions: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let actual = {};

    childProc.stdout.on('data', (data) => {
      let lines = IOHelper.parseDataBuffer(data);
      lines.forEach((l) => {
        let found = Object.keys(assertions).find((k) => {
          return l.includes(k);
        });

        if (found) {
          if (!actual[found]) {
            actual[found] = 0;
          }

          actual[found] += 1;
        }
      });
    });

    childProc.on('close', () => {
      resolve(actual);
    });
  });
}
/*
 reads from stdout and shifts entries out of the provided array as they are encountered.
 if all items are encountered in the order in which they appear in the stdout stream then the
 collection should be empty when resolved
*/
function expectInOrder(childProc: ChildProcess, expect: Array<string>, t: GenericTestContext<Context<any>>): Promise<Array<string>> {
  return new Promise((resolve, reject) => {
    let returned = false;
    childProc.stdout.on('data', (data) => {
      let lines = IOHelper.parseDataBuffer(data);
      lines.forEach((l) => {
        if (l === expect[0]) {
          expect.shift();
        }
      })
    });

    childProc.stderr.on('data', (data) => {
      if (!returned) {
        returned = true;
        t.fail();
        childProc.kill('SIGHUP');
        resolve(expect);
      }
    });

    childProc.on('close', () => {
      if (!returned) {
        returned = true;
        resolve(expect);
      }
    });
  });
}
