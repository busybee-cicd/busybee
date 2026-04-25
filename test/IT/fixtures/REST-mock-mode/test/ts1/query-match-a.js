module.exports = {
  id: 'query match a',
  testSet: [{ id: 'ts1' }],
  request: {
    method: 'GET',
    path: '/query-match',
    query: { param: 'a' },
  },
  mocks: [{ response: { status: 200, body: { result: 'a' } } }],
};
