module.exports = {
    id: "body assertion",
    testSet: [
        {
            id: "ts1"
        }
    ],
    "request": {
        method: "GET",
        path: "/body-assertion"
    },
    expect: {
        body: {
            hello: "world"
        }
    },
    mocks: [
      {
        response: {
          status: 200,
          body: {
            hello: "world"
          }
        }
      },
      {
        response: {
          status: 500
        }
      }
    ]
}
