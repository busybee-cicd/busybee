import test from 'ava';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { Logger } from '../../src/lib/Logger';
import { IOHelper } from '../../src/lib/IOHelper';
const busybee = path.join(__dirname, '../../dist/src/index.js');
const logger = new Logger({}, {constructor : {name: 'IT'}});


test(`happy path simple`, (t) => {
  return new Promise((resolve, reject) => {
    let returned = false;
    const testCmd = spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/happy-path-simple'), '-D']);

    testCmd.stderr.on('data', (data) => {
      logger.info(data.toString());

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
        t.pass();
        resolve();
      }
    });
  })
});

test(`env start failure`, async (t) => {
  const assertions = {
    'BUSYBEE_ERROR detected': 2,
    'Stopping Environment: Env That Will Fail To Start (1)': 1,
    'Stopping Environment: Env That Will Fail To Start (2)': 1,
    'Stopping Environment: Env That Starts Successfully (1)': 1,
    'Stopping Environment: Env That Starts Successfully (2)': 1,
    'Tests finished in': 1
  };

  const testCmd = spawn(busybee, ['test', '-d', path.join(__dirname, 'fixtures/env-start-failure')]);

  let actual = await analyzeOutput(testCmd, assertions);
  t.deepEqual(actual, assertions);
});

function analyzeOutput(childProcess: ChildProcess, assertions: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let actual = {};

    childProcess.stdout.on('data', (data) => {
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

    childProcess.on('close', () => {
      resolve(actual);
    });
  });
}
