module.exports = {
    "id": "status assertion",
    "testSet": [
        {
            "id": "ts1"
        }
    ],
    "request": {
        "method": "GET",
        "path": "/status-assertion"
    },
    "expect": {
        "status": 404
    }
}
