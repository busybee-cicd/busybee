import { ChildProcess } from 'child_process';
import { Logger, IOUtil } from 'busybee-util';

export class ITUtil {
  static getResult(childProc: ChildProcess, logger = null): Promise<any> {
    return new Promise<void>((resolve, reject) => {
      let returned = false;

      childProc.stdout.on('data', (data) => {
        let lines = IOUtil.parseDataBuffer(data);
        lines.forEach((l) => {
          if (l.startsWith('RESULTS:')) {
            resolve(JSON.parse(l.replace('RESULTS: ', '')));
          }
        });
      });

      childProc.stderr.on('data', (data) => {
        if (!returned) {
          returned = true;
          childProc.kill('SIGHUP');
          reject();
        }
      });

      childProc.on('close', () => {
        if (!returned) {
          returned = true;
          resolve();
        }
      });
    });
  }

  static analyzeOutputFrequency(
    childProc: ChildProcess,
    assertions: any,
    logger = null,
  ): Promise<any> {
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

  static expectInOrder(
    childProc: ChildProcess,
    expect: Array<string>,
    startsWith: boolean = false,
    logger: Logger = null,
  ): Promise<Array<string>> {
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
        });
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

  static waitFor(
    childProc: ChildProcess,
    target: string,
    startsWith: boolean = false,
    logger: Logger = null,
  ): Promise<void> {
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
        });
      });

      childProc.stderr.on('data', (data) => {
        if (!returned) {
          let msg = data.toString();
          if (logger) {
            logger.debug(msg);
          }
          returned = true;
          childProc.kill('SIGHUP');
          reject(new Error(msg));
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
