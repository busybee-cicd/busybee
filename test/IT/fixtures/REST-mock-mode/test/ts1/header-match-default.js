module.exports = {
  id: 'header match default',
  testSet: [{ id: 'ts1' }],
  request: {
    method: 'GET',
    path: '/header-match',
  },
  mocks: [{ response: { status: 200, body: { matched: false } } }],
};
