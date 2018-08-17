import {RESTTestHeaderResult} from "./RESTTestHeaderResult";
import {RESTTestPartResult} from "./RESTTestPartResult";
import {RESTTestAssertionModifications} from "../RESTTestAssertionModifications";

export class RESTTestResult {

  id: string;
  pass: boolean;
  status: RESTTestPartResult;
  headers: RESTTestHeaderResult;
  body: RESTTestPartResult;
  assertionModifications: RESTTestAssertionModifications;
  request: any;

  constructor(id: string) {
    this.pass = true;
    this.id = id;
    this.status;
    this.headers;
    this.body;
  }

}
