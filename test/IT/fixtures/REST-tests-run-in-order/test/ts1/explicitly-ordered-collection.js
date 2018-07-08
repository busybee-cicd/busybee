module.exports = [
  {
    "id": "test at index: 1",
    "testSet": [
        {
            "id": "ts1",
            "index": 1
        }
    ],
    "request": {
        "method": "GET",
        "path": "/status-assertion"
    },
    "expect": {
        "status": 404
    }
  },
  {
    "id": "test at index: 3",
    "testSet": [
        {
            "id": "ts1",
            "index": 3
        }
    ],
    "request": {
        "method": "GET",
        "path": "/status-assertion"
    },
    "expect": {
        "status": 404
    }
  },
  {
    "id": "test at index: 2",
    "testSet": [
        {
            "id": "ts1",
            "index": 2
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
]
