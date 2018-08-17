export class RESTTestHeaderResult {

  pass: boolean;
  actual: any[];
  expected: any[] | undefined;

  constructor() {
    this.pass = true;
    this.actual = [];
    this.expected = [];
  }

}
