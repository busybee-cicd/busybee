const glob = require('glob');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const uuidv1 = require('uuid/v1');
const Logger = require('./logger');
let logger;

exports.parse = function(cmdOpts, mode, DEBUG) {
  // identify directories and configFile location
  let dir = cmdOpts.directory ? cmdOpts.directory : 'feeny';
  let cFile = cmdOpts.config ? cmdOpts.config : 'config.json';
  let mockFile = cmdOpts.mockConfig ? cmdOpts.mockConfig : 'mockServer.json';
  let dirFilePath = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  let cFilePath = path.join(dirFilePath, cFile);
  let conf = JSON.parse(fs.readFileSync(cFilePath, 'utf8'));
  conf.debug = DEBUG;
  logger = new Logger(conf);
  // stash known filePaths in config
  conf.filePaths = {
    config: cFilePath,
    feenyDir: dirFilePath
  };

  let testSetSchema = { tests: [] };
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


  conf.parsedTestSuites = {};
  conf.testSet2EnvMap = {};
  conf.env2TestSuiteMap = {}; // of the envId to the Suite it belongs to.
  let skipTestSuites;
  if (cmdOpts.skipTestSuite) {
    skipTestSuites = cmdOpts.skipTestSuite.split(",");
  }
  conf.testSuites.forEach((testSuite) => {
    let suiteID = testSuite.id || uuidv1();
    if (skipTestSuites && skipTestSuites.indexOf(suiteID)) {
      testSuite.skip = true;
    }
    if (testSuite.type == "REST") {
      conf = parseRESTTestSuite(conf, testSuite, suiteID);
    }
  });


  // conf.restApi = Object.assign(conf.restApi, {testEnvs: { 'default': { id: 'default', testSets: []}}});
  // conf.restApi.envInstanceConfs.forEach((testEnvConf) => {
  //   let testSetStubs = {};
  //   if (testEnvConf.testSetConfs) {
  //     testEnvConf.testSetConfs.forEach((testSetConf) => {
  //       if (testSetStubs[testSetConf.id]) {
  //         console.log(`Test set ${testSetConf.id} already exists. Skipping`);
  //         return;
  //       }
  //
  //       testSetStubs[testSetConf.id] = {id: testSetConf.id, tests: []};
  //
  //       // store env lookup for later
  //       testSet2EnvMap[testSetConf.id] = testEnvConf.id;
  //     });
  //   }
  //
  //   conf.restApi.testEnvs[testEnvConf.id] =
  //     Object.assign(testEnvConf, {testSets: testSetStubs});
  // });

  let files = glob.sync(`${dirFilePath}/**/*.json`, {ignore:`${cFilePath}`});

  // parse json files, compile testSets and add them to the conf.
  console.log("parsing files...");
  files.forEach(function(file) {
    console.log(file);

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
        logger.log(`test '${test.name}' does not contain required prop 'testSet'. Skipping`);
        // conf.restApi.testEnvs['default'].testSets['default'].tests.push(test);
        return;
      }

      if (!Array.isArray(test.testSet)) {
        test.testSet = [test.testSet];
      }

      // iterate each testSet entry for this test (1 test can run in multiple testSets)
      test.testSet.forEach((testSetInfo) => {
        // lookup the env that this TestSet is a member of
        logger.debug(JSON.stringify(conf.testSet2EnvMap));
        logger.debug(JSON.stringify(conf.env2TestSuiteMap));

        if (_.isUndefined(conf.testSet2EnvMap[testSetInfo.id])) {
          logger.warn(`Unable to identify the Test Environment containing the testSetId '${testSetInfo.id}'.`);
          return;
        }

        let testEnvId = conf.testSet2EnvMap[testSetInfo.id];

        // lookup the suite that this env is a member of
        if (_.isUndefined(conf.env2TestSuiteMap[testEnvId])) {
          logger.warn(`Unable to identify the Test Suite containing the envId ${testEnvId}.`);
          return;
        }

        let suiteID = conf.env2TestSuiteMap[testEnvId];
        logger.debug(`suiteID: ${suiteID}`);

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


function parseRESTTestSuite(conf, testSuite, suiteID) {
  // create an id for this testSuite
  conf.parsedTestSuites[suiteID] = Object.assign(
    testSuite,
    { id: suiteID },
    {testEnvs: { 'default': { id: 'default', testSets: []}}}
  );

  // iterate each env defined for this testSuite.
  conf.parsedTestSuites[suiteID].envInstanceConfs.forEach((testEnvConf) => {
    // add this env to the env2TestSuiteMap
    logger.debug('testEnvConf');
    logger.debug(JSON.stringify(testEnvConf));
    conf.env2TestSuiteMap[testEnvConf.id] = suiteID;

    let testSetStubs = {};
    if (testEnvConf.testSetConfs) {
      testEnvConf.testSetConfs.forEach((testSetConf) => {
        // testSetStubs is a placeholder object to ensure that there is a 'tests'
        // array ready to accept tests during the test parsing step
        if (testSetStubs[testSetConf.id]) {
          console.log(`Test set ${testSetConf.id} already exists. Skipping`);
          return;
        }

        testSetStubs[testSetConf.id] = {id: testSetConf.id, tests: []};

        // store env lookup for later
        conf.testSet2EnvMap[testSetConf.id] = testEnvConf.id;
      });
    }

    conf.parsedTestSuites[suiteID].testEnvs[testEnvConf.id] =
      Object.assign(testEnvConf, {testSets: testSetStubs});
  });

  return conf;
}

function parseTestSuite() {

}
