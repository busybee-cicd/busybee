module.exports = [{
    name: 'my test',
    testSet: {
        id: 'My Test Set',
        index: 1
    },
    request: {
        method: 'GET',
        endpoint: '/my-endpoint',
        query: {
            myQueryParam: 'myQueryValue'
        },
        body: {
            myBodyKey: 'myBodyValue'
        }
    },
    expect: {
        status: 200,
        headers: {
            'my-expected-header': 'myExpectedHeaderValue'
        },
        body: (body) => {
            return body.content.hello === 'world' ? true : false;
        }
    },
    mockResponse: {
        status: 200,
        body : {
            content: {
                hello: 'world'
            }
        }

    }
}]