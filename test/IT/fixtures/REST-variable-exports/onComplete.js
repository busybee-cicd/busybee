module.exports = (err, results) => {
  console.log(JSON.stringify(results));
  console.log(`Test Passed?: ${results[0].testSets[0].pass}`);
}
