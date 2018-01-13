import {RequestOptsConfig} from "./config/common/RequestOptsConfig";
import {deserialize} from 'json-typescript-mapper';
import {ResponseBody} from "./ResponseBody";
import {RESTTest} from "./RESTTest";
import {RESTTestAssertionModifications} from "./RESTTestAssertionModifications";

export class RESTTestExpect {
    status: number;
    headers: any;
    body: any;
    assertionModifications: any;

    constructor(data: any) {
        this.status = data.status;
        this.headers = data.headers;
        this.body = data.body;
        if (data.assertionModifications) {
            this.assertionModifications = new RESTTestAssertionModifications(data.assertionModifications);
        }
    }
}