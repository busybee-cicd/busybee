/**
 * .js is the preferred test format as it is more feature-rich than .json
 * .js-based tests support
 * - 'expect' assertion callback functions. When supplying a POJO for response assertion simply will not work. 
 * A cb function can be supplied for finer-grained control of response assertion.
 * - varExports - Ability to capture values from a test response and export them for use in subsequent test requests/responses
 */
const johnDoe = {
    name: 'John Doe',
    age: 26
};

module.exports = [
    {
        name: 'Create John Doe',
        testSet: {
            id: 'My User Test Set' // notice there is no 'index' property. tests with-in the same test file will run in the order in-which they are defined unless indexes are explicitly specified.
        },
        request: {
            method: 'POST',
            path: '/user',
            body: johnDoe
        },
        expect: {
            status: 200,
            headers: {
                'some-header': 'some header value'
            },
            body: (body, varExports) => {
                // export a variable for use by other tests in the TestSet 'My Test Set'
                varExports.userId = body.content.id;
                // returning false or throwing an Exception will result in a failure.
                // assertion libraries can be used here as well.
                return (body.content.name === 'John Doe' && body.content.age === 26) ? true : false;
            }
        },
        mock: { // when running busybee in 'mock' mode, tests that use a callback function for their 'expect' should provide a POJO mock response.
            response: {
                status: 200,
                body : {
                    content: johnDoe
                }
            }
        }
    },
    {
        name: 'Fetch John Doe',
        testSet: {
            id: 'My User Test Set'
        },
        request: {
            method: 'GET',
            endpoint: 'user/#{userId}', // <--- userId referenced from varExports
        },
        expect: {
            status: 200,
            body: johnDoe
        }
    }
]