<img alt="busybee" src="https://github.build.ge.com/212589146/busybee/blob/master/img/busybee7.png?raw=true" width="300" />

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
npm install -g git+https://github.build.ge.com/Busybee/busybee.git
busybee init
busybee --help
```

See [The Configuration Docs](https://github.build.ge.com/pages/Busybee/busybee/) for detailed information on config file properties.

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

## Todo
- test adapters
  - support https://github.com/postmanlabs/newman#using-newman-as-a-nodejs-module ?
    - may just want a commandline opt for running postman tests and another for converting them to Busybee formay since Busybee supports additional features like sets and indexes.
- support healthcheck script
- transpile to support older versions of node
- Mock Server
  - support testSets with state
  - support a .spec file for documenting endpoints?
- remove placeholder 'null' entries after building testSets with skipped indexes
