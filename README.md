![feeny](https://github.build.ge.com/212589146/feeny/blob/master/feeny.jpg)

feeny
========

```
mkdir api-tests
cp example/config.json.example api-tests/config.json
cp example/test.json.example api-tests/test.json

npm install
npm start
```

## What it is
Feeny will coordinate the steps necessary to run your IT Tests and is unopinionated
when it comes to deciding how your environments are started, when you deem an environment
is ready, what technologies you're using, etc. Feeny is only concerned with the following:
1. Figure out how many Test Sets we're dealing with. Each test set will run against its own environment
so if you don't want tests to interact with one another, separate them into Test Sets.
2. Spin up a separate environment for each test set.
3. Run the tests against each environment.
4. Spin down each environment.
5. Report results.

## What it isn't
It is not a magic bullet. You still have to write tests.
It does not include the implementation of how to spin up your environment or where you environment
lives, though we provide examples of how to accomplish this. It is up to you to provide a shell script that does the dirty work of launching an env and then
returning "success" back to Feeny so that Feeny can continue on to the next step.
