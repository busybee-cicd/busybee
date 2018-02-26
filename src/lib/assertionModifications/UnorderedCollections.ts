import {KeyIdentifier} from "./KeyIdentifier";
import * as _ from 'lodash';

export class UnorderedCollections {

    static process(config: any, expected: any, actual: any) {
        try {
            KeyIdentifier.process(config, expected, actual, (currentKey, _expected, _actual) => {
                // compare the 2 collections
                let expectedCol;
                let actualCol;
                if (_expected[currentKey]) {
                    expectedCol = _expected[currentKey];
                    actualCol = _actual[currentKey];
                } else if (currentKey == '*' || _.isArray(_expected)) {
                    expectedCol = _expected;
                    actualCol = _actual;
                }

                if (!expectedCol && !actualCol) {
                    throw new Error(`The collection at '${currentKey}' cannot be found. It's possible that this collection is nested under an unorderedCollection that has already been asserted or that the collection simply does not exist.`);
                }

                // check length.
                if (expectedCol.length != actualCol.length) {
                    throw new Error(`The collections at '${currentKey}' are not of equal length. Expected == ${expectedCol.length}, Actual == ${expectedCol.length}`)
                }

                UnorderedCollections.testEqualityOfCollections(expectedCol, actualCol, currentKey);
            });
        } catch (e) {
            throw e;
           // throw new Error(`Error encountered while applying your 'assertionModifications.unorderedCollection'. Please confirm 'assertionModifications.unorderedCollection' is formatted correctly`)
        }
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
                };

                // 1. make copy. if what we're comparing is an array of arrays we just set to null because we're not going to support this;
                let expectedItemWithCollsRemoved = _.isObject(expectedItem) ? Object.assign({}, expectedItem) : expectedItem;
                let actualItemWithCollsRemoved = _.isObject(actualItem) ? Object.assign({}, actualItem) : actualItem;

                // 2. remove any child collections
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
                throw new Error(`The collections at '${currentKey}' are not equal`);
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