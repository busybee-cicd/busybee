export class RESTTestHeaderResult {

    pass: boolean;
    actual: any[];
    expected: any[];

    constructor() {
        this.pass = true;
        this.actual = [];
        this.expected = [];
    }

}
