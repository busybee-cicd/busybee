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
      "id": "Ports In Use",
      "skip": false,
      "protocol": "http",
      "ports": [7777, 7778],
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
          "id": "Env 1",
          "testSets": [
            {
              "id": "ts1",
            }
          ]
        },
        {
          "id": "Env 2",
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
