module.exports = [
  {
    "id": "user create",
    "testSet": [
        {
            "id": "ts1",
            "index": 0
        }
    ],
    "request": {
        "method": "POST",
        "path": "/user"
    },
    "expect": {
        "status": 200,
        "body": (body, variableExports) => {
          console.log('RUNNING ASSERTION');
          if (!body.id) { throw new Error('NO ID! mockserver probably not ready'); }
          console.log(body.id);
          variableExports.userId = body.id; // userId will be 12345
        }
    }
  },
  {
    "id": "user fetch",
    "testSet": [
      {
          "id": "ts1",
          "index": 1
      }
    ],
    "request": {
      "method": "GET",
      "path": "/user/#{userId}",
      "query": { // redundant but just proves 'query' is substituted properly
        id: "#{userId}"
      }
    },
    "expect": {
      "body": {
        "id": "#{userId}",
        "name": "John Doe"
      }
    }
  },
  {
    "id": "modify user",
    "testSet": [
        {
            "id": "ts1"
        }
    ],
    "request": {
        "method": "PUT",
        "path": "/user",
        "body": {
          "id": "#{userId}",
          "name": "Jane Doe"
        }
    },
    "expect": {
      body: {
        "id": 12345,
        "name": "Jane Doe"
      }
    }
  },
];
