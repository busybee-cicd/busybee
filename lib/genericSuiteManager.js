let request = require('request');
const _async = require('async');
const _ = require('lodash');
const Logger = require('./logger');

class GenericSuiteManager {
  constructor(conf, suiteEnvConf) {
    this.suiteEnvConf = suiteEnvConf;
    this.logger = new Logger(conf, this);
  }

  buildUrl(port) {
    this.logger.debug(`buildUrl ${port}`);
    let protocol = this.suiteEnvConf.protocol;
    let hostName = this.suiteEnvConf.hostName;

    let url = `${protocol}://${hostName}`;
    if (port) {
      url += `:${port}`;
    }

    return url;
  }

  buildTestTask(testEnv, testSet, generateEnvID, hostName, port) {
    this.logger.debug(`buildTestTasks <testSet> ${port}`);

    return (cb) => {
      // run the script via envManager
      let feenyDir = this.conf.filePaths.feenyDir;
      let scriptPath = path.join(feenyDir, testEnv.runScript);
      let args = [generatedEnvID, hostName, port, feenyDir, testSet.id, JSON.stringify(testSet.data)];
      envManager.runScript(scriptPath, args)
        .then((results) => {
          cb(null, results);
        })
        .catch((err) => {
          cb(err);
        })
    }
  }
}

module.exports = GenericSuiteManager;
