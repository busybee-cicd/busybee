import {RESTTestHeaderResult} from "./RESTTestHeaderResult";
import {RESTTestPartResult} from "./RESTTestPartResult";
import {RESTTestAssertionModifications} from "../RESTTestAssertionModifications";

export class RESTTestResult {

    id: string;
    index: number;
    pass: boolean;
    status: RESTTestPartResult;
    headers: RESTTestHeaderResult;
    body: RESTTestPartResult;
    assertionModifications: RESTTestAssertionModifications;
    request: any;

    constructor(id:string, index: number) {
        this.pass = true;
        this.id = id;
        this.index = index;
    }

}
