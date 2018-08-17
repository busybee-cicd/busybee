import {KeyIdentifier} from "./KeyIdentifier";
import * as _ from 'lodash';
import { Logger } from 'busybee-util';

/*
 Will only check that the collections specified are equal. Any child collections are ignored during the equality check.
 However, the collections tested ARE ordered as a result of the testing and therefor any child collections can be
 tested for equality further down the road.
 ie) if the config is ['*', '*.collection'] then the first iteration is dealing with '*'
 EXPECTED
 [
 {
 id: 1,
 collection: [a,b,c]
 },
 {
 id: 2,
 collection [d,e,f]
 }
 ]

 ACTUAL
 [
 {
 id: 2,
 collection [f,e,d]
 },
 {
 id: 1,
 collection: [c,b,a]
 },

 ]

 becomes

 EXPECTED
 [
 {
 id: 1,
 collection: [a,b,c]
 },
 {
 id: 2,
 collection [d,e,f]
 }
 ]

 ACTUAL
 [
 {
 id: 1,
 collection: [c,b,a]
 },
 {
 id: 2,
 collection [f,e,d]
 }
 ]

 Now that the outter-most collection has been deemed equal (not including child collections) and re-ordered
 so that EXEPECTED and ACTUAL are in the same order. On the next iteration when we're dealing with '*.collection'
 the 'collection' key enters the iteration with the 'collections' matched

 EXPECTED
 collection: [a,b,c]

 ACTUAL
 collection: [c,b,a]

 Next iteration

 EXPECTED
 collection [d,e,f]
 ACTUAL
 collection [f,e,d]

 */
export class UnorderedCollections {

  static process(config: any, expected: any, actual: any, logger:Logger = null) {
    KeyIdentifier.process(config, expected, actual, (currentKey, _expected, _actual) => {
      // compare the 2 collections
      let expectedCol;
      let actualCol;

      if (_expected[currentKey]) {
        expectedCol = _expected[currentKey];
        actualCol = _actual[currentKey];
      } else if (currentKey == '*' || (_.isArray(_expected) && _.isArray(_actual))) {
        expectedCol = _expected;
        actualCol = _actual;
      }

      if (!expectedCol && !actualCol) {
        // if we can't find the key then we assume that it may be null OR omitted
        // this can happen if they reference something deeply nested that isn't required. don't throw an error, just bail
        return;
      }

      // check length.
      if (expectedCol.length != actualCol.length) {
        throw new Error(`The collections at '${currentKey}' are not of equal length. Expected == ${expectedCol.length}, Actual == ${expectedCol.length}`)
      }

      UnorderedCollections.testEqualityOfCollections(expectedCol, actualCol, currentKey);
    });
  }

  static testEqualityOfCollections(expected: any, actual: any, currentKey: string) {
    if (expected.length != actual.length) {
      throw new Error(`The collections at '${currentKey}' are not of equal length. Expected == ${expected.length}, Actual == ${actual.length}`)
    }

    let expectedOrdered = [];
    let actualOrdered = [];
    expected.forEach((expectedItem) => {
      let result = _.find(actual, (actualItem) => {
        ////////
        // We don't support {'hello': [[1],[2,3],[4]]}
        ///////
        if (_.isArray(actualItem)) {
          throw new Error(`Sorry, assertionModifications.unorderedCollection doesn't support collections directly nested in collections at this. ie) {'hello': [[1],[2,3],[4]]}`);
        }
        ;

        // 1. make copy. if what we're comparing is an array of arrays we just set to null because we're not going to support this;
        let expectedItemWithCollsRemoved = _.isObject(expectedItem) ? Object.assign({}, expectedItem) : expectedItem;
        let actualItemWithCollsRemoved = _.isObject(actualItem) ? Object.assign({}, actualItem) : actualItem;

        // 2. remove any child collections (we wont take these into account for equality check)
        if (_.isObject(expectedItemWithCollsRemoved)) {
          if (UnorderedCollections.hasChildCollections(expectedItemWithCollsRemoved)
            || UnorderedCollections.hasChildCollections(actualItemWithCollsRemoved)) {
            UnorderedCollections.deleteCollectionsFromObj(expectedItemWithCollsRemoved);
            UnorderedCollections.deleteCollectionsFromObj(actualItemWithCollsRemoved);
          }
        }

        // 3. test that our items, minus any collections, are equal
        let itemsAreEqual = _.isEqual(expectedItemWithCollsRemoved, actualItemWithCollsRemoved);

        if (itemsAreEqual) {
          expectedOrdered.push(expectedItem);
          actualOrdered.push(actualItem);
        }

        return itemsAreEqual;
      });

      if (!result) {
        throw new Error(`The collections at '${currentKey}' are not equal OR the parent object is a member of an ambiguous collection`);
      }
    });


    actual.splice(0, actual.length, ...actualOrdered);
    expected.splice(0, expected.length, ...expectedOrdered);
  }

  static hasChildCollections(obj: any) {
    let ret = false;

    _.forEach(obj, (v, k) => {
      if (_.isArray(v)) {
        ret = true;
        return false;
      }
    });

    return ret;
  }

  static deleteCollectionsFromObj(obj) {
    _.forEach(obj, (v, k) => {
      if (_.isArray(v)) {
        delete obj[k];
      }
    })
  }

}
