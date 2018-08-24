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
      "id": "REST TestSuite",
      "skip": false,
      "protocol": "http",
      "ports": [7777],
      "testFolder": "REST/test",
      "env": {
        "parallel": true,
        "resourceCost": 50,
        "startScript": "REST/envStart.sh",
        "stopScript": "REST/envStop.sh",
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
          "id": "REST Env 1",
          "testSets": [
            {
              "id": "ts1"
            }
          ]
        },
        {
          "id": "REST Env 2",
          "testSets": [
            {
              "id": "ts2"
            }
          ]
        },
        {
          "id": "REST Env 3",
          "testSets": [
            {
              "id": "ts1"
            }
          ]
        },
        {
          "id": "REST Env 4",
          "testSets": [
            {
              "id": "ts2"
            }
          ]
        }
      ]
    },
    {
      "id": "USER_PROVIDED TestSuite",
      "type": "USER_PROVIDED",
      "protocol": "http",
      "ports": [7777],
      "env": {
        "resourceCost": 100,
        "startScript": "USER_PROVIDED/envStart.sh",
        "runScript": "USER_PROVIDED/run.sh",
        "stopScript": "USER_PROVIDED/envStop.sh"
      },
      "envInstances": [
        {
          "id": "USER_PROVIDED Env 1",
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
                "message": "Fail this TestSet"
              },
              assertion: (returnDataString) => {
                let data = JSON.parse(returnDataString);
                if (data.pass !== true) {
                  throw new Error('This Test Set Failed!');
                }
              }
            }
          ]
        },
        {
          "id": "USER_PROVIDED Env 2",
          "startData": {
            "message": "startData is still neat"
          },
          "stopData": {
            "message": "stopData is still also neat"
          },
          "testSets": [
            {
              "id": "ts1",
              "runData": {
                "message": "Pass this TestSet"
              },
              assertion: (returnDataString) => {
                let data = JSON.parse(returnDataString);
                if (data.pass !== true) {
                  throw new Error('This Test Set Failed!');
                }
              }
            }
          ]
        }
      ]
    }
  ]
}
