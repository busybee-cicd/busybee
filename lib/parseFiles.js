const glob = require('glob');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');

exports.parse = function(program) {
  const DEBUG = process.env.DEBUG || program.debug;
  // identify directories and configFile location
  let dir = program.directory ? program.directory : 'feeny';
  let cFile = program.config ? program.config : 'config.json';
  let dirFilePath = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  let cFilePath = path.join(dirFilePath, cFile);
  let conf = JSON.parse(fs.readFileSync(cFilePath, 'utf8'));
  // stash known filePaths in config
  conf.filePaths = {
    config: cFilePath,
    testDir: dirFilePath
  };
  conf.restApi = Object.assign({}, conf.restApi, {testSets: {}});
  conf.restApi.testSetConf.forEach((setConf) => {
    conf.restApi.testSets[setConf.id] = Object.assign({}, setConf, {tests: []});
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
      if (_.isUndefined(test.testIndex)) {
        // push it on the end
        conf.restApi.testSets[test.testSetId].tests.push(test);
      } else {
        // insert it at the proper index, fill any empty spots along the way
        Array(test.testIndex + 1).fill().forEach((d,i) => {
          if (i == test.testIndex) {
            conf.restApi.testSets[test.testSetId].tests[i] = test;
          } else {
            if (!conf.restApi.testSets[test.testSetId].tests[i]) {
              conf.restApi.testSets[test.testSetId].tests[i] = {};
            }
          }
        });
      }
    });
  });

  return conf;
}
