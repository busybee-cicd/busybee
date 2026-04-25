import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'child_process';
import * as path from 'path';
import * as http from 'http';
import { ITUtil } from './util/ITUtil';
import { Logger, IOUtil, LoggerConf } from 'busybee-util';
const busybee = path.join(__dirname, '../../dist/src/index.js');
const loggerClazz = { constructor: { name: 'ITRunner' } };
process.env['NO_PROXY'] = 'localhost,127.0.0.1';

async function makeRequest(
  uri: string,
  headers: Record<string, string> = {},
): Promise<{ statusCode: number; body: any }> {
  const response = await fetch(uri, { headers });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();
  return { statusCode: response.status, body };
}

test(`REST happy path`, () => {
  return new Promise<void>((resolve, reject) => {
    let returned = false;
    const testCmd = spawn(busybee, [
      'test',
      '-d',
      path.join(__dirname, 'fixtures/REST-happy-path'),
    ]);
    const expected = {
      runId: '82148fd0-a709-11e8-9c57-3b02ed94a9b8',
      runTimestamp: 1535051991373,
      data: [
        {
          testSets: [
            {
              pass: true,
              id: 'ts1',
              tests: [
                {
                  pass: true,
                  id: 'body assertion',
                  body: {
                    pass: true,
                    actual: {
                      hello: 'world',
                      object: {
                        '1': '2',
                        arr: [1, 3, 4],
                        nested: { im: 'nested', arr: [1, 2, 3, 4] },
                      },
                      arr: [1, 2, 3],
                    },
                  },
                  request: {
                    method: 'GET',
                    url: 'http://localhost:7777/body-assertion',
                    timeout: 30000,
                  },
                },
                {
                  pass: true,
                  id: 'status assertion',
                  status: { pass: true, actual: 404 },
                  request: {
                    method: 'GET',
                    url: 'http://localhost:7777/status-assertion',
                    timeout: 30000,
                  },
                },
              ],
            },
          ],
          pass: true,
          type: 'REST',
          id: 'REST Happy Path',
          summary: {
            numberOfPassedTests: 2,
            numberOfTestSets: 1,
            numberOfTests: 2,
          },
        },
      ],
    };
    let actual: any;
    let testWasDelayed = false;

    testCmd.stdout.on('data', (data) => {
      let lines = IOUtil.parseDataBuffer(data);
      lines.forEach((l) => {
        if (l === 'INFO: Delaying request for 1 second(s)') {
          testWasDelayed = true;
        }
        if (l.startsWith('RESULTS:')) {
          actual = JSON.parse(l.replace('RESULTS: ', ''));
        }
      });
    });

    testCmd.stderr.on('data', () => {
      if (!returned) {
        returned = true;
        testCmd.kill('SIGHUP');
        reject(new Error('Unexpected stderr output'));
      }
    });

    testCmd.on('close', () => {
      if (!returned) {
        returned = true;
        assert.deepStrictEqual(actual.data, expected.data);
        assert.strictEqual(
          testWasDelayed,
          true,
          'Body assertion test was not delayed 1 second',
        );
        resolve();
      }
    });
  });
});

test(`tests run in order`, async () => {
  const loggerConf = new LoggerConf(loggerClazz, process.env.LOG_LEVEL, null);
  const logger = new Logger(loggerConf);
  const testCmd = spawn(busybee, [
    'test',
    '-d',
    path.join(__dirname, 'fixtures/REST-tests-run-in-order'),
  ]);
  const expected = [
    'INFO: Running Test Set: ts1',
    'INFO: ts1: 0: test at index: 0',
    'INFO: ts1: 1: test at index: 1',
    'INFO: ts1: 2: test at index: 2',
    'INFO: ts1: 3: test at index: 3',
    'INFO: ts1: 4: test at index: 4',
    'INFO: ts1: #: implicitly ordered 1',
    'INFO: ts1: #: implicitly ordered 2',
    'INFO: ts1: #: implicitly ordered 3',
  ];

  let result = await ITUtil.expectInOrder(testCmd, expected, false, logger);
  assert.strictEqual(result.length, 0);
});

test(`env start failure`, async () => {
  const loggerConf = new LoggerConf(loggerClazz, process.env.LOG_LEVEL, null);
  const logger = new Logger(loggerConf);
  const expected = {
    'BUSYBEE_ERROR detected': 4,
    'Stopping Environment: Env That Will Fail To Start': 4,
    'Stopping Environment: Env That Starts Successfully': 1,
    'Restart attempt number': 3,
    'Tests finished in': 1,
  };

  const testCmd = spawn(busybee, [
    'test',
    '-d',
    path.join(__dirname, 'fixtures/env-start-failure'),
  ]);

  let actual = await ITUtil.analyzeOutputFrequency(testCmd, expected, logger);
  assert.deepStrictEqual(actual, expected);
});

test(`env healthcheck failure`, async () => {
  const loggerConf = new LoggerConf(loggerClazz, process.env.LOG_LEVEL, null);
  const logger = new Logger(loggerConf);
  const expected = [
    'INFO: Starting Environment: Env That Will Fail Healthcheck',
    'INFO: Stopping Environment: Env That Will Fail Healthcheck',
    'INFO: Starting Environment: Env That Will Pass Healthcheck',
    'INFO: Stopping Environment: Env That Will Pass Healthcheck',
    'INFO: Starting Environment: Env That Will Fail Healthcheck',
    'INFO: Stopping Environment: Env That Will Fail Healthcheck',
    'INFO: Starting Environment: Env That Will Fail Healthcheck',
    'INFO: Stopping Environment: Env That Will Fail Healthcheck',
    'INFO: Starting Environment: Env That Will Fail Healthcheck',
    'INFO: Stopping Environment: Env That Will Fail Healthcheck',
  ];

  const testCmd = spawn(busybee, [
    'test',
    '-d',
    path.join(__dirname, 'fixtures/env-healthcheck-failure'),
  ]);

  let result = await ITUtil.expectInOrder(testCmd, expected, true, logger);
  assert.strictEqual(result.length, 0);
});

test(`ports in use`, async () => {
  const loggerConf = new LoggerConf(loggerClazz, process.env.LOG_LEVEL, null);
  const logger = new Logger(loggerConf);
  const server = http.createServer();
  server.listen(8888);

  await new Promise<void>((resolve, reject) => {
    server.on('listening', async () => {
      resolve();
    });
    server.on('error', (err) => {
      reject(err);
    });
  });

  const childEnv = Object.assign({}, process.env, { LOG_LEVEL: 'TRACE' });
  const testCmd = spawn(
    busybee,
    ['test', '-d', path.join(__dirname, 'fixtures/ports-in-use')],
    { env: childEnv },
  );
  const expected = {
    'TRACE:EnvManager: arePortsInUseByBusybee  | 8888,8889': 1,
    'TRACE:EnvManager: 8889 is available': 2,
    'TRACE:EnvManager: 8888 is in use': 1,
    'TRACE:EnvManager: ports identified: {"ports":[8889,8890],"portOffset":1}': 1,
    'TRACE:EnvManager: ports identified: {"ports":[8891,8892],"portOffset":3}': 1,
    'INFO:Object: Tests finished in': 1,
  };

  let actual = await ITUtil.analyzeOutputFrequency(testCmd, expected, logger);
  assert.deepStrictEqual(actual, expected);

  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
});

test(`USER_PROVIDED happy path`, async () => {
  const loggerConf = new LoggerConf(loggerClazz, process.env.LOG_LEVEL, null);
  const logger = new Logger(loggerConf);
  const childEnv = Object.assign({}, process.env, {
    MY_ENV_VAR: 'MY_ENV_VAR Was Passed to run.sh',
  });
  const testCmd = spawn(
    busybee,
    [
      'test',
      '-d',
      path.join(__dirname, 'fixtures/USER_PROVIDED-happy-path'),
      '-D',
    ],
    { env: childEnv },
  );
  const expected = [
    'DEBUG:EnvManager: startData is neat',
    'DEBUG:EnvManager: MY_ENV_VAR Was Passed to run.sh',
    'DEBUG:EnvManager: runData rules',
    'DEBUG:EnvManager: stopData is also neat',
  ];
  const result = await ITUtil.expectInOrder(testCmd, expected, false, logger);
  assert.strictEqual(result.length, 0);
});

test(`REST mock mode`, async () => {
  const loggerConf = new LoggerConf(loggerClazz, process.env.LOG_LEVEL, null);
  const logger = new Logger(loggerConf);
  const testCmd = spawn(busybee, [
    'mock',
    '-d',
    path.join(__dirname, 'fixtures/REST-mock-mode'),
    '--testSuite',
    'REST Mock Mode',
  ]);
  await ITUtil.waitFor(
    testCmd,
    'INFO: Mock Server listening on 3030',
    false,
    logger,
  );

  const uri = 'http://localhost:3030/body-assertion';
  try {
    let okRes = await makeRequest(uri);
    assert.strictEqual(okRes.statusCode, 200);
    assert.deepStrictEqual(okRes.body, { hello: 'world' });

    let failRes = await makeRequest(uri);
    assert.strictEqual(failRes.statusCode, 500);
  } catch (e) {
    assert.fail(e.message);
  }

  try {
    let okRes = await makeRequest(uri);
    assert.strictEqual(okRes.statusCode, 200);
    assert.deepStrictEqual(okRes.body, { hello: 'world' });

    let notFoundRes = await makeRequest(uri, { 'busybee-mock-status': '404' });
    assert.strictEqual(notFoundRes.statusCode, 404);
  } catch (e) {
    assert.fail(e.message);
  }

  // query param matching: same path, different query params route to different mocks
  try {
    let resA = await makeRequest('http://localhost:3030/query-match?param=a');
    assert.strictEqual(resA.statusCode, 200);
    assert.deepStrictEqual(resA.body, { result: 'a' });

    let resB = await makeRequest('http://localhost:3030/query-match?param=b');
    assert.strictEqual(resB.statusCode, 200);
    assert.deepStrictEqual(resB.body, { result: 'b' });
  } catch (e) {
    assert.fail(e.message);
  }

  // POST body matching: same path, different request bodies route to different mocks
  try {
    let resA = await fetch('http://localhost:3030/post-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'a' }),
    });
    assert.strictEqual(resA.status, 200);
    assert.deepStrictEqual(await resA.json(), { result: 'a' });

    let resB = await fetch('http://localhost:3030/post-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'b' }),
    });
    assert.strictEqual(resB.status, 200);
    assert.deepStrictEqual(await resB.json(), { result: 'b' });
  } catch (e) {
    assert.fail(e.message);
  }

  // header matching: mock with required header takes priority; falls back to headerless mock
  try {
    let withHeader = await makeRequest('http://localhost:3030/header-match', {
      'x-custom': 'yes',
    });
    assert.strictEqual(withHeader.statusCode, 200);
    assert.deepStrictEqual(withHeader.body, { matched: true });

    let withoutHeader = await makeRequest('http://localhost:3030/header-match');
    assert.strictEqual(withoutHeader.statusCode, 200);
    assert.deepStrictEqual(withoutHeader.body, { matched: false });
  } catch (e) {
    assert.fail(e.message);
  }

  // unmatched request returns 404
  try {
    let unmatchedRes = await makeRequest(
      'http://localhost:3030/no-such-endpoint',
    );
    assert.strictEqual(unmatchedRes.statusCode, 404);
  } catch (e) {
    assert.fail(e.message);
  }

  // CORS: Access-Control-Allow-Origin header is present on responses by default
  try {
    let corsRes = await fetch('http://localhost:3030/body-assertion');
    assert.ok(corsRes.headers.get('access-control-allow-origin'));
  } catch (e) {
    assert.fail(e.message);
  }

  testCmd.kill('SIGHUP');
});

test(`REST variable exports`, async () => {
  const loggerConf = new LoggerConf(loggerClazz, process.env.LOG_LEVEL, null);
  const logger = new Logger(loggerConf);
  const expected = ['Test Passed?: true'];

  const testCmd = spawn(busybee, [
    'test',
    '-d',
    path.join(__dirname, 'fixtures/REST-variable-exports'),
  ]);

  let result = await ITUtil.expectInOrder(testCmd, expected, false, logger);
  assert.strictEqual(result.length, 0);
});
