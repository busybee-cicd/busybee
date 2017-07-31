const glob = require('glob');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');

exports.parse = function(cmdOpts, DEBUG) {
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
    testDir: dirFilePath
  };

  let testSetSchema = { tests: [] };
  conf.restApi = Object.assign({}, conf.restApi, {testSets: { id: 'default', tests: []}});
  conf.restApi.testSetConf.forEach((setConf) => {
    conf.restApi.testSets[setConf.id] =
      Object.assign({}, setConf, {tests: []});
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
      if (_.isUndefined(test.testSet)) {
        conf.restApi.testSets['default'].tests.push(test);
        return
      }

      if (!Array.isArray(test.testSet)) {
        test.testSet = [test.testSet];
      }

      test.testSet.forEach((testSetInfo) => {
        if (_.isUndefined(testSetInfo.index)) {
          // push it on the end
          conf.restApi.testSets[testSetInfo.id].tests.push(test);
        } else {
          // insert it at the proper index, fill any empty spots along the way
          Array(testSetInfo.index + 1).fill().forEach((d,i) => {
            if (i == testSetInfo.index) {
              conf.restApi.testSets[testSetInfo.id].tests[i] = test;
            } else {
              if (!conf.restApi.testSets[testSetInfo.id].tests[i]) {
                conf.restApi.testSets[testSetInfo.id].tests[i] = {};
              }
            }
          });
        }
      });
    });
  });

  return conf;
}
