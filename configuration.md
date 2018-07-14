# Busybee Configuration

*Welcome to the home of Busybee's configuration documentation. The definitions are auto-generated using [Typedoc](http://typedoc.org/) and while not perfect for documenting the JSON config that a user must provide, Typedoc served as the quickest path to achieving thorough and maintainable documentation of the models that user-provide JSON is mapped to once parsed. We will likely re-visit our documentation strategy in the future*

## Configuring A Busybee TestSuite
### BusybeeUserConfig
In order to run Busybee one must first set up a top-level `config.js/json` file which will be parsed by Busybee at runtime and mapped to the [BusybeeUserConfig](classes/_src_models_config_busybeeuserconfig_.busybeeuserconfig.html) model. The BusybeeUserConfig is where a user will define not only the TestSuite(s) but also the available compute resources available to Busybee. Please reference the [BusybeeUserConfig](classes/_src_models_config_busybeeuserconfig_.busybeeuserconfig.html) for more information on how to structure your `config.js/json`.

#### REST vs USER_PROVIDED TestSuite's
Busybee provides a test schema for testing REST api's. If a REST api is what you would like to test with your TestSuite then configure the `type` as `'REST'` and provide [RESTTest](classes/_src_models_resttest_.resttest.html) files. When you run `busybee test` if everything is configured properly your [RESTTest](classes/_src_models_resttest_.resttest.html) will be parsed and used to run requests against an already running REST service or one that Busybee has provisioned for testing purposes.

### Providing .sh scripts for starting and stopping environments
In many cases you will want Busybee to spin up your Service(s) being tested and then tear them down afterward. In order to do this you must provide a `startScript` and a `stopScript`. This are simply `.sh` files that will be called once Busybee has identified an available resource to provision your test environment to. Busybee will pass all of the necesssary information to your `startScript` and `stopScript` as json so that you can provision your environment accordingly.

Example of parsing json passed to startScript using the `jq` commandline tool.
```
#!/bin/bash
ENV_ID=$(echo "$1" | jq -r ".generatedEnvID")
HOST=$(echo "$1" | jq -r ".hostName")
API_PORT=$(echo "$1" | jq -r ".ports[0]") # ports are passed in the same order in which they are provided in your config.json
BUSYBEE_DIR=$(echo "$1" | jq -r ".busybeeDir")
```

### USER_PROVIDED TestSuite's
The only additional requirement of a `USER_PROVIDED` TestSuite is that a `runScript` is configured. The `runScript` will be called once an envirnmonet has been provisioned and is ready (in the even that Busybee is configured to do so) or once an existing environment has been confirmed to be ready. The `runScript` is where you should run your test commands, reporters, etc. A successful run should return an `exit 0`


