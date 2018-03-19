import {KeyIdentifier} from './KeyIdentifier';

export class IgnoreKeys {

  static process(config: any, expected: any, actual: any) {
    try {
      KeyIdentifier.process(config, expected, actual, (currentKey, expected, actual) => {
        delete expected[currentKey];
        delete actual[currentKey];
      });
    } catch (e) {
      throw new Error(`Error encountered while applying 'ignoreKeys'. Please confirm 'ignoreKeys' is formatted correctly`);
    }
  }

}
