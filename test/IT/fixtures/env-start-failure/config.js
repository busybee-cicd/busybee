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
        "resourceCost": 50,
        "startScript": "envStart.sh",
        "stopScript": "envStop.sh",
        "healthcheck": {
          "type": "REST",
          "retries": 30,
          "request": {
            "path": "/200",
            "port": 7777,
            "timeout": 5000
          }
        }
      },
      "envInstances": [
        {
          "id": "Env That Will Fail To Start",
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
          "id": "Env That Starts Successfully",
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
