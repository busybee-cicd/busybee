const glob = require('glob');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const uuidv1 = require('uuid/v1');

exports.parse = function(cmdOpts, mode, DEBUG) {
  // identify directories and configFile location
  let dir = cmdOpts.directory ? cmdOpts.directory : 'feeny';
  let cFile = cmdOpts.config ? cmdOpts.config : 'config.json';
  let mockFile = cmdOpts.mockConfig ? cmdOpts.mockConfig : 'mockServer.json';
  let dirFilePath = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  let cFilePath = path.join(dirFilePath, cFile);
  let conf = JSON.parse(fs.readFileSync(cFilePath, 'utf8'));
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

  let testSet2EnvMap = {}
  conf.restApi = Object.assign(conf.restApi, {testEnvs: { 'default': { id: 'default', testSets: []}}});
  conf.restApi.testEnvConfs.forEach((testEnvConf) => {
    let testSetStubs = {};
    if (testEnvConf.testSetConfs) {
      testEnvConf.testSetConfs.forEach((testSetConf) => {
        if (testSetStubs[testSetConf.id]) {
          console.log(`Test set ${testSetConf.id} already exists. Skipping`);
          return;
        }

        testSetStubs[testSetConf.id] = {id: testSetConf.id, tests: []};

        // store env lookup for later
        testSet2EnvMap[testSetConf.id] = testEnvConf.id;
      });
    }

    conf.restApi.testEnvs[testEnvConf.id] =
      Object.assign(testEnvConf, {testSets: testSetStubs});
  });

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
        conf.restApi.testEnvs['default'].testSets['default'].tests.push(test);
        return
      }

      if (!Array.isArray(test.testSet)) {
        test.testSet = [test.testSet];
      }

      // iterate each testSet entry for this test (1 test can run in multiple testSets)
      test.testSet.forEach((testSetInfo) => {
        // lookup the env that this TestSet is a member of
        let testEnvId = testSet2EnvMap[testSetInfo.id];
        if (_.isUndefined(testSetInfo.index)) {
          // push it on the end
          conf.restApi.testEnvs[testEnvId].testSets[testSetInfo.id].tests.push(test);
        } else {
          // insert it at the proper index, fill any empty spots along the way
          Array(testSetInfo.index + 1).fill().forEach((d,i) => {
            if (i == testSetInfo.index) {
              conf.restApi.testEnvs[testEnvId].testSets[testSetInfo.id].tests[i] = test;
            } else {
              if (!conf.restApi.testEnvs[testEnvId].testSets[testSetInfo.id].tests[i]) {
                conf.restApi.testEnvs[testEnvId].testSets[testSetInfo.id].tests[i] = {};
              }
            }
          });
        }
      });
    });
  });

  return conf;
}
