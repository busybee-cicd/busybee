import {KeyIdentifier} from "./KeyIdentifier";
import * as _ from 'lodash';

export class UnorderedCollections {

    static process(config: any, expected: any, actual: any) {
        try {
            KeyIdentifier.process(config, expected, actual, (currentKey, _expected, _actual) => {
                // compare the 2 collections
                let expectedCol = currentKey === '.' ? _expected : _expected[currentKey];
                let actualCol = currentKey === '.' ? _actual : _actual[currentKey];

                // check length.
                if (expectedCol.length != actualCol.length) {
                    throw new Error(`The collections at '${currentKey}' are not of equal length. Expected == ${expectedCol.length}, Actual == ${expectedCol.length}`)
                }

                expectedCol.forEach((expectedItem) => {
                    let result = _.find(actualCol, (actualItem) => {
                        return _.isEqual(expectedItem, actualItem);
                    });

                    if (!result) {
                        throw new Error(`The collections at '${currentKey}' are not equal`);
                    }
                });

                // remove these collections once they've been confirmed to be equal.
                if (currentKey === '.') {
                    _expected.length = 0;
                    _actual.length = 0;
                } else {
                    delete _expected[currentKey];
                    delete _actual[currentKey];
                }
            });
        } catch (e) {
            throw e;
           // throw new Error(`Error encountered while applying your 'assertionModifications.unorderedCollection'. Please confirm 'assertionModifications.unorderedCollection' is formatted correctly`)
        }
    }

}