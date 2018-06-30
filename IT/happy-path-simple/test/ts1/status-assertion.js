module.exports = {
    "id": "status assertion",
    "testSet": [
        {
            "id": "ts1"
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
