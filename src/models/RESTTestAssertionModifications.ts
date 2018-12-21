import { RequestOptsConfig } from './config/common/RequestOptsConfig';
import { deserialize } from 'json-typescript-mapper';
import { ResponseBody } from './ResponseBody';

export class RESTTestAssertionModifications {
  ignoreKeys: any;
  unorderedCollections: any;

  constructor(data: any) {
    this.ignoreKeys = data.ignoreKeys;
    this.unorderedCollections = data.unorderedCollections;
  }
}
