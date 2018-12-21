import test from 'ava';
import { RESTSuiteManager } from '../../src/managers/RESTSuiteManager';
import { BusybeeParsedConfig } from '../../src/models/config';
import { UnitUtil } from './util/UnitUtil';

test(`confirm that requestOpts are susbstituted`, t => {
  const config: BusybeeParsedConfig = UnitUtil.getBusybeeParsedConfig();
  const manager: RESTSuiteManager = UnitUtil.getRESTSuiteManager(config);
  const variableExports = {
    myPathValue: 'my-path-value',
    myHeaderValue: 'header value',
    myQueryValue: 'queryValue',
    myNumberValue: 1,
    myStringValue: 'my string property',
    myObjectValue: {
      hello: 'world'
    }
  };
  const requestOpts: any = {
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
  const expected: any = {
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
