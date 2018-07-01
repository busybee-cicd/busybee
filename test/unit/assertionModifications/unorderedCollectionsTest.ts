import test from 'ava';
import {UnorderedCollections} from "../../../src/lib/assertionModifications/UnorderedCollections";

test(`'*' will only check the top-level collection and does not apply to any unordered subCollections`, (t) => {
    let expected = [
        {
            subCollection: [
                1,2,3,4
            ]
        },
        {
            "key": "value",
            subCollection: [
                5,6,7,8
            ]
        }
    ];

    let actual = [
        {
            "key": "value",
            subCollection: [
                8,6,7,5
            ]
        },
        {
            subCollection: [
                4,3,2,1
            ]
        },
    ];

    UnorderedCollections.process(['*'], expected, actual);
    t.notDeepEqual(expected, actual);
});

test(`this passes because the user has specified both the unordered top-level and the unordered subCollection`, (t) => {
    let expected = [
        {
            subCollection: [
                1,2,3,4
            ]
        },
        {
            "key": "value",
            subCollection: [
                5,6,7,8
            ]
        }
    ];

    let actual = [
        {
            "key": "value",
            subCollection: [
                8,6,7,5
            ]
        },
        {
            subCollection: [
                4,3,2,1
            ]
        },
    ];
    UnorderedCollections.process(['*', '*.subCollection'], expected, actual);
    t.deepEqual(expected, actual);
});


test(`an ordered top-level collection can contain un-ordered child collection`, (t) => {
    let expected = [
        {
            subCollection: [
                1,2,3,4
            ]
        },
        {
            "key": "value",
            subCollection: [
                5,6,7,8
            ]
        }
    ];

    let actual = [
        {
            subCollection: [
                4,3,2,1
            ]
        },
        {
            "key": "value",
            subCollection: [
                8,6,7,5
            ]
        }
    ];

    UnorderedCollections.process(['*.subCollection'], expected, actual);
    t.deepEqual(expected, actual);
});

test(`it aborts when a sub-collection doesn't exist in a payload`, (t) => {
  let expected = [
    {
      subCollection: [
        1,2,3,4
      ]
    },
    {
      "key": "b",
      subCollection: [
        5,6,7,8
      ]
    },
    {
      "key": "a"
    }
  ];

  let actual = [
    {
      "key": "a"
    },
    {
      subCollection: [
        4,3,2,1
      ]
    },
    {
      "key": "b",
      subCollection: [
        8,6,7,5
      ]
    }
  ];

  UnorderedCollections.process(['*', '*.subCollection'], expected, actual);
  t.deepEqual(expected, actual);
});

test(`it catches when 2 unorderedCollections are NOT equal at the top-level`, (t) => {
  let expected = [
    {
      subCollection: [
        1,2,3,4
      ]
    },
    {
      "key": "value",
      subCollection: [
        5,6,7,8
      ]
    },
    {
      "key": "hello"
    }
  ];

  let actual = [
    {
      "key": "world"
    },
    {
      subCollection: [
        4,3,2,1
      ]
    },
    {
      "key": "value",
      subCollection: [
        8,6,7,5
      ]
    }
  ];

  try {
    UnorderedCollections.process(['*', '*.subCollection'], expected, actual);
  } catch (e) {
    t.is(e.message, `The collections at '*' are not equal OR the parent object is a member of an ambiguous collection`);
  }
});

test(`it throws an error when collections are ambiguous and there is know way to know if the order is correct`, (t) => {
    let expected = [
        {
            subCollection: [
                1,2,3,4
            ]
        },
        {
            subCollection: [
                5,6,7,8
            ]
        }
    ];

    let actual = [
        {
            subCollection: [
                8,6,7,5
            ]
        },
        {
            subCollection: [
                4,3,2,1
            ]
        }
    ];

    try {
      UnorderedCollections.process(['*', '*.subCollection'], expected, actual);
    } catch (e) {
      t.is(e.message, `The collections at 'subCollection' are not equal OR the parent object is a member of an ambiguous collection`);
    }
});
