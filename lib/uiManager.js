let request = require('request');
const _async = require('async');
const _ = require('lodash');

class UIManager {
  constructor(conf) {
    this.conf = conf;
  }


  buildTestTasks(testSet, port) {
    // UI testSet's only have 1 testTask which is to run the uiTestScript.sh
    return testSet.tests.map((test, i) => {
      return (cb) => {
        if (!test.runScript) {
          console.log(`testSet ${testSet.name}:${test.name} does not contain a runScript property`);
          cb(null);
        }

        let consoleText;
        if (_.isUndefined(test.testIndex)) {
          consoleText = `${testSet.id}: #: ${test.name}`;
        } else {
          consoleText = `${testSet.id}: ${test.testIndex}: ${test.name}`
        }
        console.log(consoleText)

        // run the test
        execRunScript(test)
          .then((results) => {
            cb(null, results)
          })
          .catch((err) => {
            cb(err);
          });
      };
    });
  }
}

execRunScript(test, port) {
  return new Promise(async (resolve, reject) => {
    try {
      let args = [`${conf.ui.protocol}://${conf.ui.host}`, port];
      const { stdout, stderr } = await execFile(path.join(this.conf.filePaths.testDir, test.runScript), args);

      if (stdout) {
        resolve(stdout);
      } else {
        reject("Failed to run UI Tests");
      }
    } catch (err) {
      reject();
    }
  });
}

module.exports = UIManager;
