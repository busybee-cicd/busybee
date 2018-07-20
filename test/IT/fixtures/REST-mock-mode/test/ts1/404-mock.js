module.exports = {
  id: 'body assertion 404 status',
  description: 'the aim of this file is to prove that a mock can be explicitly defined and not be used as a test. \
  In addition, if it does not return a 200 it will not be used unless the busybee-mock-status header is passed',
  testSet: [
      {
          id: 'ts1'
      }
  ],
  request: {
      method: 'GET',
      path: '/body-assertion'
  },
  mocks: [
    {
      response: {
        status: 404
      }
    }
  ]
}
