module.exports = [{
    "name": "my test",
    "skip": false,
    "delay": 0,
    "testSet": {
        "id": "My Test Set",
        "index": 1
    },
    "request": {
        "method": "GET",
        "endpoint": "/my-endpoint",
        "query": {
            "myQueryParam": "myQueryValue"
        },
        "body": {
            "myBodyKey": "myBodyValue"
        }
    },
    "expect": {
        "status": 200,
        "headers": {
            "my-expected-header": "myExpectedHeaderValue"
        },
        "body": (body) => {
            try {
                return body.content.hello === 'world' ? true : false;
            } catch (e) {
                return false;
            }

        }
    },
    "mockResponse": {
        "status": 200,
        "body" : {
            "content": {
                "hello": "world"
            }
        }

    }
}]