module.exports = {
  "id": "user fetch from a separate file",
  "description": "this is here to prove that variableExports are available to all members of a testSet regardless \
  of the .js file they are defined with-in",
  "testSet": [
    {
        "id": "ts1",
        "index": 2
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
}
