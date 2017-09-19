export class RequestOptsConfig {
  headers: any;
  query: any;
  body: any;
  json: boolean;
  endpoint: string;
  timeout: number;
  port: number;
  method: string;

  constructor() {
    this.method = void 0;
    this.headers = void 0;
    this.query = void 0;
    this.body = void 0;
    this.json = void 0;
    this.endpoint = void 0;
    this.timeout = void 0;
    this.port = void 0;
  }
}
