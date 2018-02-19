export class RESTTestHeaderResult {

    pass: boolean;
    headerName: string;
    actual: string | string[];
    expected: string | string[];

    constructor(headerName: string, pass = true, actual?: string | string[], expected?: string | string[]) {
        this.headerName = headerName;
        this.pass = pass;
        this.actual = actual ? actual : this.actual;
        this.expected = expected ? expected : this.expected;
    }

}
