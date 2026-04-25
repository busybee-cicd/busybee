module.exports = {
  id: 'query match b',
  testSet: [{ id: 'ts1' }],
  request: {
    method: 'GET',
    path: '/query-match',
    query: { param: 'b' },
  },
  mocks: [{ response: { status: 200, body: { result: 'b' } } }],
};
