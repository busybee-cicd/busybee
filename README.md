![feeny](https://github.build.ge.com/212589146/feeny/blob/master/feeny.jpg)

feeny
========

* [Requirements](#Requirements)
* [Quickstart](#quickstart)
* [About](#about)
    * [What it is](#what-it-is)
    * [What it isn't](#what-it-isnt)
* [Todo](#todo)

## Requirements
- Node.js 8 or higher. The library relies on async/await syntax only supported in the lastest NodeJS version. However, I plan to transpile the library to support older NodeJS versions.

## Quickstart
```
npm install -g git+https://502740163@github.build.ge.com/212589146/feeny.git
feeny init
feeny --help
```

## About

### What it is
Feeny will coordinate the steps necessary to run your Functional Tests and is unopinionated
when it comes to deciding how your environments are started, when you deem an environment
is ready, what technologies you're using, etc. Feeny is only concerned with the following:  

1. Figure out how many Test Sets we're dealing with. Each test set will run against its own environment
so if you don't want tests to interact with one another, separate them into Test Sets.
2. Spin up a separate environment for each test set.
3. Run the tests against each environment.
4. Spin down each environment.
5. Report results.

### What it isn't
It is not a magic bullet. You still have to write tests.
It does not include the implementation of how to spin up your environment or where you environment
lives, though we provide examples of how to accomplish this. It is up to you to provide a shell script that does the dirty work of launching an env and then
returning "success" back to Feeny so that Feeny can continue on to the next step.

## helpful information
- env.startScript is passed `envId`, `apiHost`, `port`, `testDirectoryPath` as arguments.
- env.stopScript is passed  `envId` as an argument.

## Configuration
By default, Feeny will look for configuration in feeny/config.json

### config.json
- `onCompleteScript` - String: The name of a .sh file that will be run on completion of all TestSets.
- `restApi` - [RestApi](#RestApi)
- `env` - [Env](#Env)


#### Config Object Dictionary

##### RestApi
- `protocol` - String: rest api protocol
- `host` - String: rest api host
- `port` - Number: rest api port
- `root` - String: root context of all api calls ie) /v1.
- `defaultRequestOpts` - [DefaultRequestOpts](#DefaultRequestOpts): an object representing request params to be sent by default on
each api request. defaultRequestOpts can be overridden with-in individual tests.
- `envInstanceConfs` - [Array:TestEnvInstanceConf](#TestEnvInstanceConf) Only required if using TestSets. Allows you to separate 1 or more TestSet's into different different environments to avoid interaction.

##### DefaultRequestOpts  
Options sent by on each request by default  
- `headers` - Object: request headers as key/value pairs. ie) {'my-header': 'my-header-value'}
- `query` - Object: request query params as key/value pairs ie) {'my-query-param': 'my-query-value'}
- `body` - Object: request body as key/value pairs ie) {'my-body-prop': 'my-body-prop-value'}

##### TestEnvInstanceConf
- `id` - String: a unique id used to identify this TestEnv.
- `testSetConfs` - [Array:TestSetConf](#TestSetConf): A TestEnv can only have tests added to it via a TestSet and therefore requires at least one TestSetConf.

##### TestSetConf
**IMPORTANT** the `id` field of a TestSetConf must be unique across environments
- `id` - String: a unique id used to identify the Test Set.

#### Env
Configuration opts for provisioning Test Set Environments
- `singleServer` - Boolean: Describes if all environments will be deployed to the same server or not. Primarily used to coordinate ports when provisioning an env.
- `parallelism` - Number: The max number of environments to run simultaneously.
- `startScript` - String:
- `stopScript` - String:
- `healthcheck` - [HealthCheckConf](#HealthCheckConf)

#### HealthCheckConf
- `type` - String:
- `retries` - Number:
- `request` - Object: Optional based on 'type'
  ```
    "request": {
      "endpoint": "/privileges",
      "timeout": 1500
    }
  ```

## Todo
- test adapters
  - support https://github.com/postmanlabs/newman#using-newman-as-a-nodejs-module ?
    - may just want a commandline opt for running postman tests and another for converting them to Feeny formay since Feeny supports additional features like sets and indexes.
- support healthcheck script
- transpile to support older versions of node
- Mock Server
  - support testSets with state
  - support behavior, delays in mocks (timeout)
  - support a .spec file for documenting endpoints?
