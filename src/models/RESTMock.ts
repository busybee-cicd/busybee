import {deserialize} from 'json-typescript-mapper';
import {ResponseBody} from "./ResponseBody";

export class RESTMock {
  lag: number;
  response: ResponseBody;

  constructor(data: any) {
    if (!data) { return; }
    this.response = deserialize(ResponseBody, data.response);
    this.lag = data.lag;
  }
}
