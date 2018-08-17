import {KeyIdentifier} from './KeyIdentifier';
import { Logger } from 'busybee-util';

export class IgnoreKeys {

  static process(config: any, expected: any, actual: any, logger:Logger = null) {
    try {
      KeyIdentifier.process(config, expected, actual, (currentKey, expected, actual) => {
        delete expected[currentKey];
        delete actual[currentKey];
      });
    } catch (e) {
      if (logger) {
        logger.debug(e, true);
      }
      throw new Error(`Error encountered while applying 'ignoreKeys'. Please confirm 'ignoreKeys' is formatted correctly`);
    }
  }

}
