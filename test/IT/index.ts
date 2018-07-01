import test from 'ava';
import { spawn } from 'child_process';
import * as path from 'path';
import { Logger } from '../../src/lib/Logger';

const busybee = path.join(__dirname, '../../dist/src/index.js');
const logger = new Logger({}, {constructor : {name: 'IT'}});


test(`happy path simple`, (t) => {
  return new Promise((resolve, reject) => {
    let returned = false;
    const testCmd = spawn(busybee, ['test', '-d', path.join(__dirname, 'happy-path-simple'), '-D']);

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
