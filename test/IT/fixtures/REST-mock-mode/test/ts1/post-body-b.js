module.exports = {
  id: 'post body b',
  testSet: [{ id: 'ts1' }],
  request: {
    method: 'POST',
    path: '/post-match',
    body: { type: 'b' },
  },
  mocks: [{ response: { status: 200, body: { result: 'b' } } }],
};
