export class ParsedTestSetConfig {
  id: string;
  tests: Object[];

  constructor() {
    this.tests = <Object []> [];
  }
}
