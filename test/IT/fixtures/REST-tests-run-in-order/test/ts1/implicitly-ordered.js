module.exports = [
  {
    "id": "implicitly ordered 1",
    "testSet": [
        {
            "id": "ts1",
        }
    ],
    "request": {
        "method": "GET",
        "path": "/body-assertion"
    },
    "expect": {
        "body": {
            "hello": "world",
            "object": {
                "1" : "2",
                "arr" : [1,3,4],
                "nested" : {
                    "im": "nested",
                    "arr" : [1,2,3,4]
                }
            },
            "arr" : [1,2,3]
        }
    }
  },
  {
    "id": "implicitly ordered 2",
    "testSet": [
        {
            "id": "ts1",
        }
    ],
    "request": {
        "method": "GET",
        "path": "/body-assertion"
    },
    "expect": {
        "body": {
            "hello": "world",
            "object": {
                "1" : "2",
                "arr" : [1,3,4],
                "nested" : {
                    "im": "nested",
                    "arr" : [1,2,3,4]
                }
            },
            "arr" : [1,2,3]
        }
    }
  },
  {
    "id": "implicitly ordered 3",
    "testSet": [
        {
            "id": "ts1",
        }
    ],
    "request": {
        "method": "GET",
        "path": "/body-assertion"
    },
    "expect": {
        "body": {
            "hello": "world",
            "object": {
                "1" : "2",
                "arr" : [1,3,4],
                "nested" : {
                    "im": "nested",
                    "arr" : [1,2,3,4]
                }
            },
            "arr" : [1,2,3]
        }
    }
  }
]
