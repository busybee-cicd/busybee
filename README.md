# busybee

- [Requirements](#Requirements)
- [Quickstart](#quickstart)
- [About](#about)
  - [What it is](#what-it-is)
  - [What it isn't](#what-it-isnt)
- [Todo](#todo)

## Quickstart

```
npm install -g busybee
busybee init
busybee --help
```

See [The Configuration Docs](https://github.com/pages/busybee-cicd/busybee/) for detailed information on config file properties.

## About

### What it is

Busybee started as integration testing tool specifically for testing REST API's via an opinionated schema and grew to include several features such as

- environment provisioning - busybee can coordinate spinning up and tearing down enviornments in conjunction with test execition
- arbitrary test scripts - while busybee provides a spec for defining JSON REST API tests, it can just as easily run your `do-whatever-i-say.sh` during the test execution phase and wait for a response.
- proxy server (mock mode) - for TDD flows where UI engineers want to start before the API is working, busybee can convert a RestTest definition into a working endpoint that returns mock data. Requests to the busybee proxy server which don't match any endpoints (test definitions) are proxied through to the real API.

#### Concepts

**TestSuite**
The top-level unit of configuration. A TestSuite defines the protocol, host, ports, and root path used to connect to the service under test. It also declares the optional `startScript`/`stopScript` shell scripts for environment lifecycle management and a `healthcheck` for confirming the service is ready before tests run. If no `startScript` is provided, Busybee assumes the service is already running and skips provisioning.

**EnvInstance**
Each TestSuite can declare one or more EnvInstances. An EnvInstance represents one running copy of the environment. Multiple EnvInstances allow the same TestSuite to run against several environments concurrently — useful for parallel load or configuration testing. Each EnvInstance declares which TestSets it will execute.

**TestSet**
A TestSet is a named group of tests that run together within an EnvInstance. Tests are assigned to a TestSet from within their test file (via the `testSet.id` field), not from config. This means tests are discovered by globbing the configured `testFolder` — any test file that references a known TestSet id is automatically included. TestSets run in series by default; parallel execution with a concurrency limit is also supported.

**Tests**
For REST TestSuites, individual tests are defined in `.json` or `.js` files under the `testFolder`. Each test specifies a `request` (method, path, headers, query, body) and an `expect` (status, headers, body). Tests can optionally declare an `index` to enforce execution order within their TestSet; unindexed tests run after indexed ones. Busybee makes the request, compares the response against the expectation, and records a pass/fail result along with latency.

**startScript / stopScript**
Optional shell scripts called before and after test execution respectively. Busybee passes environment details (host, ports, generated environment ID) as a JSON argument. The `startScript` is responsible for starting the service; the `stopScript` for tearing it down. Both are omitted when Busybee is used against an already-running service.

**onComplete**
An optional JS module (configured via `--onComplete` or in config) that receives the full result set once all TestSuites have finished. Use it to integrate with external reporting systems, post results to CI, or trigger notifications.

## Todo

Check out the [Github Issues Page](https://github.com/busybee-cicd/busybee/issues) for a list of future bugfixes and enhancements

## License

MIT © [stowns](https://github.com/stowns)
