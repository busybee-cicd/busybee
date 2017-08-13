let request = require('request');
const _async = require('async');
const _ = require('lodash');
const path = require('path');
const Logger = require('./logger');

class GenericSuiteManager {
  constructor(conf, suiteEnvConf, envManager) {
    this.conf = conf;
    this.suiteEnvConf = suiteEnvConf;
    this.envManager = envManager;
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

  async runTestSets(generatedEnvID) {
    this.logger.debug(`runTestSets ${this.suiteEnvConf.suiteID} ${this.suiteEnvConf.suiteEnvID}`);
    // TODO: logic for running TestSets in order
    return new Promise((resolve, reject) => {
      let testSetPromises = _.map(this.suiteEnvConf.testSets, (testSet, id) => {
        return this.runTestSet(testSet, generatedEnvID);
      });

      let testSetResults;
      let testSetErr;
      try {
        testSetResults = Promise.all(testSetPromises);
      } catch (e) {
        testSetErr = e;
      }

      if (testSetErr) {
        this.logger.debug(`runTestSets ERROR encountered while running testSetPromises`);
        reject(testSetErr);
      } else {
        resolve(testSetResults);
      }
    });

  }

  async runTestSet(testSet, generatedEnvID) {
      this.logger.debug(`runTestSet ${this.suiteEnvConf.suiteID} ${this.suiteEnvConf.suiteEnvID} ${testSet.id}`);
      // run the script via envManager
      let feenyDir = this.conf.filePaths.feenyDir;
      let scriptPath = path.join(feenyDir, this.suiteEnvConf.runScript);

      let args = {
        generatedEnvID: generatedEnvID,
        protocol: this.suiteEnvConf.protocol,
        hostName: this.suiteEnvConf.hostName,
        ports: this.suiteEnvConf.ports,
        feenyDir: feenyDir,
        data: JSON.stringify(testSet.data)
      };

      return this.envManager.runScript(scriptPath, [args]);
  }

}

module.exports = GenericSuiteManager;
