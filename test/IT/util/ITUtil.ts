import { ChildProcess } from 'child_process';
import { IOUtil } from '../../../src/lib/IOUtil';
import { GenericTestContext, Context } from 'ava';
import { Logger } from '../../../src/lib/Logger';

export class ITUtil {

  /**
   * looks for occurrences of strings in a stdout stream of a child process
   * when given an assertions object {stringToFind: numberOfOccurrences}
   *
   * @param childProc
   * @param assertions
   * @param logger
   */
  static analyzeOutputFrequency(childProc: ChildProcess, assertions: any, logger = null): Promise<any> {
    return new Promise((resolve, reject) => {
      let actual = {};

      childProc.stdout.on('data', (data) => {
        let lines = IOUtil.parseDataBuffer(data);
        lines.forEach((l) => {
          if (logger) {
            logger.debug(l);
          }
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
        if (logger) {
          logger.debug('child process closing');
        }
        resolve(actual);
      });
    });
  }

  /**
   *
   * reads from stdout and shifts entries out of the provided array as they are encountered.
   * if all items are encountered in the order in which they appear in the stdout stream then the
   * collection should be empty when resolved
   *
   * @param childProc
   * @param expect
   * @param t
   * @param startsWith
   * @param logger
   */
  static expectInOrder(childProc: ChildProcess, expect: Array<string>, t: GenericTestContext<Context<any>>, startsWith:boolean = false, logger:Logger = null): Promise<Array<string>> {
    return new Promise((resolve, reject) => {
      let returned = false;
      childProc.stdout.on('data', (data) => {
        let lines: string[] = IOUtil.parseDataBuffer(data);
        lines.forEach((l) => {
          if (logger) {
            logger.debug(l);
          }
          if (startsWith) {
            if (l.startsWith(expect[0])) {
              expect.shift();
            }
          } else {
            if (l === expect[0]) {
              expect.shift();
            }
          }

        })
      });

      childProc.stderr.on('data', (data) => {
        if (!returned) {
          if (logger) {
            logger.debug(data.toString());
          }
          returned = true;
          childProc.kill('SIGHUP');
          resolve(expect);
        }
      });

      childProc.on('close', () => {
        if (!returned) {
          if (logger) {
            logger.debug('child process closing');
          }
          returned = true;
          resolve(expect);
        }
      });
    });
  }

  /**
   * waits for a provided string to appear in stdout and then resolves
   *
   * @param childProc
   * @param target
   * @param t
   * @param startsWith
   * @param logger
   */
  static waitFor(childProc: ChildProcess, target: string, t: GenericTestContext<Context<any>>, startsWith:boolean = false, logger:Logger = null): Promise<Array<string>> {
    return new Promise((resolve, reject) => {
      let returned = false;
      childProc.stdout.on('data', (data) => {
        let lines: string[] = IOUtil.parseDataBuffer(data);
        lines.forEach((l) => {
          if (logger) {
            logger.debug(l);
          }
          if (startsWith) {
            if (l.startsWith(target)) {
              resolve();
            }
          } else {
            if (l === target) {
              resolve();
            }
          }

        })
      });

      childProc.stderr.on('data', (data) => {
        if (!returned) {
          let msg = data.toString();
          if (logger) {
            logger.debug(msg);
          }
          returned = true;
          t.fail(msg);
          childProc.kill('SIGHUP');
          reject(msg);
        }
      });

      childProc.on('close', () => {
        if (!returned) {
          if (logger) {
            logger.debug('child process closing');
          }
          returned = true;
          resolve();
        }
      });
    });
  }
}
