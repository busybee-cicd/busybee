import test from 'ava';
import { IgnoreKeys } from "../../../src/lib/assertionModifications/IgnoreKeys";

test(`keys are successfully removed from a basic object`, (t) => {
  let actual = {
    hello: 1,
    world: 2
  };

  let expected = {
    hello: 1,
    world: 3
  };

  IgnoreKeys.process(['world'], actual, expected);
  t.deepEqual(actual, expected);
});

test(`keys are successfully removed from a collection of objects`, (t) => {
  let actual = [
    {
      hello: 1,
      world: 3
    },
    {
      hello: 1,
      world: 3
    }
  ];

  let expected = [
    {
      hello: 1,
      world: 3
    },
    {
      hello: 1,
      world: 3
    }
  ];

  IgnoreKeys.process(['*.world'], actual, expected);
  t.deepEqual(actual, expected);
});

test(`keys are successfully removed from an object nested in a collection of objects`, (t) => {
  let actual = [
    {
      hello: 1,
      world: {
        a: 'b',
        c: 'd'
      }
    },
    {
      hello: 1,
      world: {
        a: 'b',
        c: 'd'
      }
    }
  ];

  let expected = [
    {
      hello: 1,
      world: {
        a: 'wrong',
        c: 'd'
      }
    },
    {
      hello: 1,
      world: {
        a: 'wrong',
        c: 'd'
      }
    }
  ];

  IgnoreKeys.process(['*.world.a'], actual, expected);
  t.deepEqual(actual, expected);
});

test(`keys are successfully removed from an object using object syntax`, (t) => {
  let actual = {
    hello: 1,
    world: {
      a: 'b',
      c: 'd'
    }
  };

  let expected = {
    hello: 1,
    world: {
      a: 'wrong',
      c: 'd'
    }
  };

  IgnoreKeys.process(
    [
      {
        'world': 'a'
      }
    ],
    actual,
    expected
  );
  t.deepEqual(actual, expected);
});

test(`keys are successfully removed from a collection of objects using object syntax`, (t) => {
  let actual = [
    {
      hello: 1,
      world: {
        a: 'b',
        c: 'd'
      }
    },
    {
      hello: 1,
      world: {
        a: 'b',
        c: 'd'
      }
    }
  ];

  let expected = [
    {
      hello: 1,
      world: {
        a: 'wrong',
        c: 'd'
      }
    },
    {
      hello: 1,
      world: {
        a: 'wrong',
        c: 'd'
      }
    }
  ];

  IgnoreKeys.process(
    [
      {
        '*': 'world.a'
      }
    ],
    actual,
    expected
  );
  t.deepEqual(actual, expected);
});
