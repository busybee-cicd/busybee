module.exports = {
    "id": "test at index: 0",
    "testSet": [
        {
            "id": "ts1",
            "index": 0
        }
    ],
    "request": {
        "method": "GET",
        "endpoint": "/status-assertion"
    },
    "expect": {
        "status": 404
    }
}
