module.exports = (err, results) => {
  console.log(JSON.stringify(results));
  console.log(`Test Passed?: ${results.data[0].testSets[0].pass}`);
}
