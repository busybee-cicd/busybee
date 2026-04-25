import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IgnoreKeys } from '../../../src/lib/assertionModifications/IgnoreKeys';

test(`keys are successfully removed from a basic object`, () => {
  let actual = {
    hello: 1,
    world: 2,
  };

  let expected = {
    hello: 1,
    world: 3,
  };

  IgnoreKeys.process(['world'], actual, expected);
  assert.deepStrictEqual(actual, expected);
});

test(`keys are successfully removed from a collection of objects`, () => {
  let actual = [
    {
      hello: 1,
      world: 3,
    },
    {
      hello: 1,
      world: 3,
    },
  ];

  let expected = [
    {
      hello: 1,
      world: 3,
    },
    {
      hello: 1,
      world: 3,
    },
  ];

  IgnoreKeys.process(['*.world'], actual, expected);
  assert.deepStrictEqual(actual, expected);
});

test(`keys are successfully removed from an object nested in a collection of objects`, () => {
  let actual = [
    {
      hello: 1,
      world: {
        a: 'b',
        c: 'd',
      },
    },
    {
      hello: 1,
      world: {
        a: 'b',
        c: 'd',
      },
    },
  ];

  let expected = [
    {
      hello: 1,
      world: {
        a: 'wrong',
        c: 'd',
      },
    },
    {
      hello: 1,
      world: {
        a: 'wrong',
        c: 'd',
      },
    },
  ];

  IgnoreKeys.process(['*.world.a'], actual, expected);
  assert.deepStrictEqual(actual, expected);
});

test(`keys are successfully removed from an object using object syntax`, () => {
  let actual = {
    hello: 1,
    world: {
      a: 'b',
      c: 'd',
    },
  };

  let expected = {
    hello: 1,
    world: {
      a: 'wrong',
      c: 'd',
    },
  };

  IgnoreKeys.process(
    [
      {
        world: 'a',
      },
    ],
    actual,
    expected,
  );
  assert.deepStrictEqual(actual, expected);
});

test.skip(`keys are successfully removed from a collection of objects using object syntax`, () => {
  let actual = [
    {
      hello: 1,
      world: {
        a: 'b',
        c: 'd',
      },
    },
    {
      hello: 1,
      world: {
        a: 'b',
        c: 'd',
      },
    },
  ];

  let expected = [
    {
      hello: 1,
      world: {
        a: 'wrong',
        c: 'd',
      },
    },
    {
      hello: 1,
      world: {
        a: 'wrong',
        c: 'd',
      },
    },
  ];

  IgnoreKeys.process(
    [
      {
        '*': 'world.a',
      },
    ],
    actual,
    expected,
  );
  assert.deepStrictEqual(actual, expected);
});
