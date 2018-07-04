module.exports = {
  "envResources": [{
    "hosts": [
      {
        "name": "localhost"
      }
    ]
  }],
  "onComplete": "onComplete.js",
  "testSuites" : [
    {
      "id": "Happy Path",
      "skip": false,
      "protocol": "http",
      "ports": [7777],
      "testFolder": "test",
      "env": {
        "parallel": true,
        "resourceCost": 50,
        "startScript": "envStart.sh",
        "stopScript": "envStop.sh",
        "healthcheck": {
          "type": "REST",
          "retries": 30,
          "request": {
            "endpoint": "/200",
            "port": 7777,
            "timeout": 5000
          }
        }
      },
      "envInstances": [
        {
          "id": "Env 1",
          "testSets": [
            {
              "id": "ts1"
            }
          ]
        }
      ]
    }
  ]
}
