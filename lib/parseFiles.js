const glob = require("glob");
const fs = require("fs");
const _ = require("lodash");
const DEBUG = process.env.DEBUG;

exports.parse = function(program) {
  let dir = program.directory ? program.directory : 'integration-tests';
  let cFile = program.config ? program.config : 'config.json';
  let conf = JSON.parse(fs.readFileSync(`${process.cwd()}/${dir}/${cFile}`, 'utf8'));
  conf.testSets = {};
  conf.testSetConf.forEach((setConf) => {
    conf.testSets[setConf.id] = Object.assign({}, setConf, {tests: []});
  });

  let files = glob.sync(`${process.cwd()}/${dir}/**/*.json`, {ignore:`${process.cwd()}/${dir}/${cFile}`});

  console.log("parsing files...")
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
        conf.testSets[test.testSetId].tests.push(test);
      } else {
        // insert it at the proper index, fill any empty spots along the way
        Array(test.testIndex + 1).fill().forEach((d,i) => {
          if (i == test.testIndex) {
            conf.testSets[test.testSetId].tests[i] = test;
          } else {
            if (!conf.testSets[test.testSetId].tests[i]) {
              conf.testSets[test.testSetId].tests[i] = {};
            }
          }
        });
      }
    });
  });

  return conf;
}
