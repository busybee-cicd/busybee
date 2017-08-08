const glob = require('glob');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const uuidv1 = require('uuid/v1');
const Logger = require('./logger');

class ConfigParser {
  constructor(cmdOpts) {
    let dir = cmdOpts.directory ? cmdOpts.directory : 'feeny';
    let cFile = cmdOpts.config ? cmdOpts.config : 'config.json';
    let mockFile = cmdOpts.mockConfig ? cmdOpts.mockConfig : 'mockServer.json';
    this.feenyDirPath = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
    this.cFilePath = path.join(this.feenyDirPath, cFile);
    this.cmdOpts = cmdOpts;
    this.testSet2EnvMap = {};
    this.env2TestSuiteMap = {};
    if ((this.cmdOpts && this.cmdOpts.debug) || process.env.FEENY_DEBUG) {
      this.debug = true;
    }
    this.logger = new Logger({debug: this.debug});
  }

  parse(mode) {
    let conf = JSON.parse(fs.readFileSync(this.cFilePath, 'utf8'));
    Object.assign(conf, {
      filePaths: {
        config: this.cFilePath,
        feenyDir: this.feenyDirPath
      },
      cmdOpts: this.cmdOpts,
      debug: this.debug
    });

    conf = this.prepTestSuites(conf);
    return this.parseFiles(conf, mode);
  }

  prepTestSuites(conf) {
    /*
      Goal here is to build an object that looks like
      {
        testEnvs: {
          'default': {
            id: 'default',
            testSets: {
              'default': {
                id: 'default',
                tests: []
              }
            }
          }
        }
      }

      And a map for easily identifying which env a testSet is a member of (for parsing mocks later)
      {
        "testSetId": "envId"
      }
    */
    this.logger.debug(`prepTestSuites`);

    conf.parsedTestSuites = {};
    let skipTestSuites;

    if (this.cmdOpts.skipTestSuite) {
      skipTestSuites = this.cmdOpts.skipTestSuite.split(',');
    }

    conf.testSuites.forEach((testSuite) => {
      let suiteID = testSuite.id || uuidv1();
      if (skipTestSuites && skipTestSuites.indexOf(suiteID)) {
        testSuite.skip = true;
      }
      if (testSuite.type == 'REST') {
        conf = this.parseRESTTestSuite(conf, testSuite, suiteID);
      }
    });

    return conf;
  }

  parseRESTTestSuite(conf, testSuite, suiteID) {
    this.logger.debug(`parseRESTTestSuite ${testSuite} ${suiteID}`);

    // create an id for this testSuite
    conf.parsedTestSuites[suiteID] = Object.assign(
      testSuite,
      { id: suiteID },
      {testEnvs: { 'default': { id: 'default', testSets: []}}}
    );

    // iterate each env defined for this testSuite.
    conf.parsedTestSuites[suiteID].envInstances.forEach((testEnvConf) => {
      // add this env to the env2TestSuiteMap
      this.logger.debug('testEnvConf');
      this.logger.debug(JSON.stringify(testEnvConf));
      this.env2TestSuiteMap[testEnvConf.id] = suiteID;

      let testSetStubs = {};
      if (testEnvConf.testSets) {
        testEnvConf.testSets.forEach((testSetConf) => {
          // testSetStubs is a placeholder object to ensure that there is a 'tests'
          // array ready to accept tests during the test parsing step
          if (testSetStubs[testSetConf.id]) {
            this.logger.info(`Test set ${testSetConf.id} already exists. Skipping`);
            return;
          }

          testSetStubs[testSetConf.id] = {id: testSetConf.id, tests: []};

          // store env lookup for later
          this.testSet2EnvMap[testSetConf.id] = testEnvConf.id;
        });
      }

      conf.parsedTestSuites[suiteID].testEnvs[testEnvConf.id] =
        Object.assign(testEnvConf, {testSets: testSetStubs});
    });

    return conf;
  }

  parseFiles(conf, mode) {
    this.logger.debug(`parseFiles`);
    let files = glob.sync(`${this.feenyDirPath}/**/*.json`, {ignore:`${this.cFilePath}`});

    // parse json files, compile testSets and add them to the conf.
    this.logger.info("parsing files...");
    files.forEach((file) => {
      this.logger.info(file);

      let data = fs.readFileSync(file, 'utf8');
      var tests = JSON.parse(data);
      if (!Array.isArray(tests)) {
        tests = [tests];
      }

      tests.forEach((test) => {
        if (mode == 'test') {
          if (test.mock || test.skip) { return; }
        }
        if (_.isUndefined(test.testSet)) {
          this.logger.log(`test '${test.name}' does not contain required prop 'testSet'. Skipping`);
          // conf.restApi.testEnvs['default'].testSets['default'].tests.push(test);
          return;
        }

        if (!Array.isArray(test.testSet)) {
          test.testSet = [test.testSet];
        }

        // iterate each testSet entry for this test (1 test can run in multiple testSets)
        test.testSet.forEach((testSetInfo) => {
          // lookup the env that this TestSet is a member of
          this.logger.debug(JSON.stringify(this.testSet2EnvMap));
          this.logger.debug(JSON.stringify(this.env2TestSuiteMap));

          if (_.isUndefined(this.testSet2EnvMap[testSetInfo.id])) {
            this.logger.warn(`Unable to identify the Test Environment containing the testSetId '${testSetInfo.id}'.`);
            return;
          }

          let testEnvId = this.testSet2EnvMap[testSetInfo.id];

          // lookup the suite that this env is a member of
          if (_.isUndefined(this.env2TestSuiteMap[testEnvId])) {
            this.logger.warn(`Unable to identify the Test Suite containing the envId ${testEnvId}.`);
            return;
          }

          let suiteID = this.env2TestSuiteMap[testEnvId];
          this.logger.debug(`suiteID: ${suiteID}`);

          if (_.isUndefined(testSetInfo.index)) {
            // push it on the end
            conf.parsedTestSuites[suiteID].testEnvs[testEnvId].testSets[testSetInfo.id].tests.push(test);
            //conf.restApi.testEnvs[testEnvId].testSets[testSetInfo.id].tests.push(test);
          } else {
            // insert it at the proper index, fill any empty spots along the way
            Array(testSetInfo.index + 1).fill().forEach((d,i) => {
              if (i == testSetInfo.index) {
                conf.parsedTestSuites[suiteID].testEnvs[testEnvId].testSets[testSetInfo.id].tests[i] = test;
              } else {
                if (!conf.parsedTestSuites[suiteID].testEnvs[testEnvId].testSets[testSetInfo.id].tests[i]) {
                  conf.parsedTestSuites[suiteID].testEnvs[testEnvId].testSets[testSetInfo.id].tests[i] = {};
                }
              }
            });
          }
        });
      });
    });

    return conf;
  }

  parseTestSuite() {

  }

}

module.exports = ConfigParser;
