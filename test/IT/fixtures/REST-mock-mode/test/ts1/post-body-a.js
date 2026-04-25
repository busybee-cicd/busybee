module.exports = {
  id: 'post body a',
  testSet: [{ id: 'ts1' }],
  request: {
    method: 'POST',
    path: '/post-match',
    body: { type: 'a' },
  },
  mocks: [{ response: { status: 200, body: { result: 'a' } } }],
};
