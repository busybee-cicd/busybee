module.exports = {
  "envResources": [{
    "hosts": [
      {
        "name": "localhost"
      }
    ]
  }],
  "testSuites" : [
    {
      "id": "Env Start Failure",
      "skip": false,
      "protocol": "http",
      "ports": [7777],
      "testFolder": "test",
      "env": {
        "parallel": true,
        "resourceCost": 100,
        "startScript": "envStart.sh",
        "stopScript": "envStop.sh",
        "healthcheck": {
          "type": "REST",
          "retries": 3,
          "request": {
            "path": "/200",
            "port": 7777,
            "timeout": 5000
          }
        }
      },
      "envInstances": [
        {
          "id": "Env That Will Fail Healthcheck",
          "startData": {
            "fail": true
          },
          "testSets": [
            {
              "id": "ts1",
            }
          ]
        },
        {
          "id": "Env That Will Pass Healthcheck",
          "startData": {
            "fail": false
          },
          "testSets": [
            {
              "id": "ts1",
            }
          ]
        }
      ]
    }
  ]
}
