module.exports = {
  id: 'header match specific',
  testSet: [{ id: 'ts1' }],
  request: {
    method: 'GET',
    path: '/header-match',
    headers: { 'x-custom': 'yes' },
  },
  mocks: [{ response: { status: 200, body: { matched: true } } }],
};
