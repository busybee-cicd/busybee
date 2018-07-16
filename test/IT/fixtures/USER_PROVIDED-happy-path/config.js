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
      "id": "USER_PROVIDED Happy Path",
      "type": "USER_PROVIDED",
      "skip": false,
      "protocol": "http",
      "ports": [7777],
      "env": {
        "resourceCost": 100,
        "startScript": "envStart.sh",
        "runScript": "run.sh",
        "stopScript": "envStop.sh"
      },
      "envInstances": [
        {
          "id": "Env 1",
          "startData": {
            "message": "startData is neat"
          },
          "stopData": {
            "message": "stopData is also neat"
          },
          "testSets": [
            {
              "id": "ts1",
              "runData": {
                "message": "runData rules"
              }
            }
          ]
        }
      ]
    }
  ]
}
