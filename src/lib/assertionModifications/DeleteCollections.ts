import {KeyIdentifier} from "./KeyIdentifier";
import * as _ from 'lodash';

export class DeleteCollections {

  static process(config: any, expected: any, actual: any) {
    try {
      KeyIdentifier.process(config, expected, actual, (currentKey, _expected, _actual) => {
        // compare the 2 collections
        let expectedCol = currentKey === '.' ? _expected : _expected[currentKey];
        let actualCol = currentKey === '.' ? _actual : _actual[currentKey];

        if (currentKey === '.') {
          _expected.length = 0;
          _actual.length = 0;
        } else {
          _expected[currentKey].length = 0;
          _actual[currentKey].length = 0;

          // delete _expected[currentKey];
          // delete _actual[currentKey];
        }
      });
    } catch (e) {
      throw e;
      // throw new Error(`Error encountered while applying your 'assertionModifications.unorderedCollection'. Please confirm 'assertionModifications.unorderedCollection' is formatted correctly`)
    }
  }

}
