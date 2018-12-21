'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var ava_1 = require('ava');
var UnitUtil_1 = require('./util/UnitUtil');
ava_1.default('confirm that requestOpts are susbstituted', function(t) {
  var config = UnitUtil_1.UnitUtil.getBusybeeParsedConfig();
  var manager = UnitUtil_1.UnitUtil.getRESTSuiteManager(config);
  var variableExports = {
    myPathValue: 'my-path-value',
    myHeaderValue: 'header value',
    myQueryValue: 'queryValue',
    myNumberValue: 1,
    myStringValue: 'my string property',
    myObjectValue: {
      hello: 'world'
    }
  };
  var requestOpts = {
    url: 'http://localhost/#{myPathValue}',
    headers: {
      'my-header': '#{myHeaderValue}'
    },
    qs: {
      queryParam: '#{myQueryValue}'
    },
    body: {
      numberProperty: '#{myNumberValue}',
      stringProperty: '#{myStringValue}',
      objectProperty: '#{myObjectValue}'
    }
  };
  var expected = {
    url: 'http://localhost/my-path-value',
    headers: {
      'my-header': 'header value'
    },
    qs: {
      queryParam: 'queryValue'
    },
    body: {
      numberProperty: 1,
      stringProperty: 'my string property',
      objectProperty: {
        hello: 'world'
      }
    }
  };
  manager.processRequestOptsForVariableDeclarations(
    requestOpts,
    variableExports
  );
  t.deepEqual(requestOpts, expected);
});
//# sourceMappingURL=variableExports.js.map
