import { ChildProcess } from "child_process";
import { IOUtil } from "../../src/lib/IOUtil";
import { GenericTestContext, Context } from "ava";

export class ITUtil {

  /*
  looks for occurrences of strings in a stdout stream of a child process
  when given an assertions object {stringToFind: numberOfOccurrences}
  */
  static analyzeOutputFrequency(childProc: ChildProcess, assertions: any): Promise<any> {
    return new Promise((resolve, reject) => {
      let actual = {};

      childProc.stdout.on('data', (data) => {
        let lines = IOUtil.parseDataBuffer(data);
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
  static expectInOrder(childProc: ChildProcess, expect: Array<string>, t: GenericTestContext<Context<any>>, startsWith:boolean = false): Promise<Array<string>> {
    return new Promise((resolve, reject) => {
      let returned = false;
      childProc.stdout.on('data', (data) => {
        let lines = IOUtil.parseDataBuffer(data);
        lines.forEach((l) => {
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
          t.log(data.toString());
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
}
