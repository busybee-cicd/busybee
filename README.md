<img alt="busybee" src="https://github.build.ge.com/212589146/busybee/blob/master/img/busybee7.png" width="300" />

busybee
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
npm install -g git+https://502740163@github.build.ge.com/212589146/busybee.git
busybee init
busybee --help
```

## About

### What it is
Busybee will coordinate the steps necessary to run your Functional Tests. It is unopinionated
when it comes to deciding how your environments are started, when they're ready, what technologies are used, etc. Busybee is only concerned with the following:  

1. Figure out how many [Test Suites](#TestSuite) we're dealing with.
2. Figure out how many [Environments](#Env) are required for each [Test Suite](#TestSuite)
3. Figure out how many [Test Sets](#TestSet) to run against each [Environment](#Env).
2. Spin up each [Environment](#Env)
3. Run the [Test Sets](#TestSet)
4. Spin down each [Environment](#Env).
5. Report results.

### What it isn't
It is not a magic bullet. You still have to write tests. You still have to provide 'start' and 'stop' scripts detailing how start/stop your environments. If your [Test Suite](#TestSuite) is not a REST [Test Suite](#TestSuite) then you will also need to provide a 'run' script that actually runs your tests once the environment as been provisioned.

## Configuration (BusybeeUserConfig)
By default, Busybee will look for configuration in busybee/config.json

### config.json
- `envResources` - [Array:EnvResource](#EnvResource)
- `onComplete` - String: The name of a .js file to call on completion of all Test Suites. Must export a single function with the signature (errors, results).
- `testSuites`* - [Array:TestSuite](#TestSuite)
---
#### TestSuite
- `id`* - String: A unique id for this Test Suite
- `type`* - String `allowed: [REST, other]`: Dictates how the Test Suite is parsed. Busybee has it's own REST api testing implementation. For all other test suites choose 'other'
- `skip` - Boolean `default:false`: Whether or not to skip this Test Suite
- `env`* - [Env](#Env)
- `envInstances`* - [Array:EnvInstance](#TestEnvInstance)

*The following fields are availble IF type == 'REST'*

##### REST
- `protocol`* - String: rest api protocol
- `host` - String: optional host. Only required if --skipEnvProvisioning is enabled.
- `ports`* - Array:Number: Ports required by this suite. By default the first port supplied will be used for your healthcheck port if not specific in the [HealthCheck](#HealthCheck)
- `root` - String: root context of all api calls ie) /v1.
- `defaultRequestOpts` - [DefaultRequestOpts](#DefaultRequestOpts): an object representing request params to be sent by default on
each api request. defaultRequestOpts can be overridden with-in individual tests.
- `mockServer` - [MockServer](#MockServer)


---
#### DefaultRequestOpts  
Options sent by on each request by default  
- `headers` - Object: request headers as key/value pairs. ie) {'my-header': 'my-header-value'}
- `query` - Object: request query params as key/value pairs ie) {'my-query-param': 'my-query-value'}
- `body` - Object: request body as key/value pairs ie) {'my-body-prop': 'my-body-prop-value'}

---
#### EnvResource
Configuration opts for provisioning Test Set Environments
- `hosts`* - [Array:Host](#Host)

---
#### Host
- `name`* - String: hostName of an available resource.
- `capacity` - Integer: A crude measurement of the total resources available at this host. By default, 100. 100. In this scenario, a [TestSuite.env](#TestSuite) with a `resourceCost` of 50 would be able to run 2 instances on this host simultaneously. When an instance of a Test Suite is added to a host its resourceCost is added to the `load` of that host. If an instance's (resourceCost + host.currentLoad) > capacity then the instance will wait until instances are removed from the host.

---
#### Env
Not to be confused with [EnvInstance](#EnvInstance). Env represents the base Environment configuration that will be shared by all instances of your Test Suite environment.
- `parallel` - Boolean: Dictates whether or not this Test Suite is allowed to run multiple instances on a single resource simultaneously
- `resourceCost` - A measurement of how many 'resource units' 1 instance of this env will consume while running. See [Host.capacity](#Host)
- `startScript`* - String: A shell script expected to start your environment. Receives the following arguments `generatedEnvID`, `hostName`, `port`, `testDirectoryPath`
- `stopScript`* - String: A shell script expected to stop your environment. Receives the following arguments `generatedEnvID`, `hostName`, `port`, `testDirectoryPath`
- `healthcheck`* - [HealthCheck](#HealthCheck)

---
#### EnvInstance
- `id`* - String: a unique id used to identify this TestEnv.
- `testSets`* - [Array:TestSet](#TestSet): A TestEnv can only have tests added to it via a TestSet and therefore requires at least one TestSet.

---
#### TestSet
**IMPORTANT** the `id` field of a TestSet must be unique across environments
- `id`* - String: a unique id used to identify the Test Set.

---
#### HealthCheck
- `type`* - String `allowed: [REST]`
- `retries` - Number

*The following fields are availble IF [TestSuite.type](#TestSuite) == 'REST'*

##### REST
- `request`* - Object
  ```
    "request": {
      "endpoint": "/privileges",
      "timeout": 1500,
      "port": 3000
    }
  ```

---
#### RequestOptsConfig
- `headers` - Object:
- `query` - Object:
- `body` - Object:
- `json` - Boolean: passes 'application/json' header and parses returned body as json.
- `endpoint` - String:
- `timeout` - Integer: timeout in seconds
- `port` -
- `method` - String: `allowed: [GET, PUT, POST, DELETE]`

---
####  MockServer
A MockServer configuration allows for REST-based tests to be parsed and have their responses served when the defined request is made to the mock server. This effectively allows for you to define a test (request/response) prior to implementing the feature and have a server ready to server this response for UI developers.
- `port` - String: port to run the mock server on. defaults to the port defined in the [TestSuite](#TestSuite) being mocked.
- `root` - String: a root context that should be prepended to paths defined in a Test Suite and/or Test.
- `proxy` - [Array:MockProxy](#MockProxy)
- `injectedRequestOpts` - [RequestOpts](#RequestOpts) - allows UI developers to mimic an intermediate service which may decorate the request with additional headers, params, body, etc. Opts specified in this section will be merged into the request once it arrives at the Mock Server but before attempting to match a mocked test.

---
#### MockProxy
A MockProxy defines a actual server running a full-implemented api. When running a MockServer if a route is not matched the request will be proxied to this server allowing for partial mocking.
- `protocol`* - String `allowed: [http, https]`: protocol of the target server
- `host`* - String: hostName of the target server
- `port`* - Number: port of the target server

---
#### RequestOpts
```
ex)
"headers": {
  "my-header": "myHeaderValue"
},
"query": {
  "myQueryParam": "myQueryValue"
},
"body": {
  "myBodyKey": "myBodyValue"
}
```
---
## Todo
- test adapters
  - support https://github.com/postmanlabs/newman#using-newman-as-a-nodejs-module ?
    - may just want a commandline opt for running postman tests and another for converting them to Busybee formay since Busybee supports additional features like sets and indexes.
- support healthcheck script
- transpile to support older versions of node
- Mock Server
  - support testSets with state
  - support behavior, delays in mocks (timeout)
  - support a .spec file for documenting endpoints?
- do a true portscan when searching for open ports
- remove placeholder 'null' entries after building testSets with skipped indexes
