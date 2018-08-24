module.exports = {
    "id": "body fn assertion error",
    "delayRequest": 5,
    "testSet": [
        {
            "id": "ts2"
        }
    ],
    "request": {
        "method": "GET",
        "path": "/body-assertion"
    },
    "expect": {
        "body": () => {
          throw new Error('you should see this error!');
        }
    }
}
