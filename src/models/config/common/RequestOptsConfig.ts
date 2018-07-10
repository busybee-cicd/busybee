/*
Properties of an http/https Request
*/
export class RequestOptsConfig {
  headers: any;
  query: any;
  body: any;
  json: boolean;
  path: string;
  /**
   * milliseconds
   */
  timeout: number;
  port: number;
  /**
   * **Allowed** `GET` `PUT` `POST` `DELETE`
   */
  method: string;
  /**
   * Allows you to override the TestSuiteConfig.root value
   */
  root: string;

  constructor() {
    this.method = void 0;
    this.headers = void 0;
    this.query = void 0;
    this.body = void 0;
    this.json = void 0;
    this.path = void 0;
    this.timeout = void 0;
    this.port = void 0;
    this.root = void 0;
  }

}
