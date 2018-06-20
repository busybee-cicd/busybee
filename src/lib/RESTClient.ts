import * as request from 'request-promise';
import * as _ from 'lodash';
import {Logger} from './Logger';
import {RequestOptsConfig} from "../models/config/common/RequestOptsConfig";
import {IncomingMessage} from "http";
import {TestSetConfig} from "../models/config/user/TestSetConfig";
import {ParsedTestSuite} from "../models/config/parsed/ParsedTestSuiteConfig";
import {BusybeeParsedConfig} from "../models/config/BusybeeParsedConfig";

export class RESTClient {

  conf: BusybeeParsedConfig;
  suiteEnvConf: any;
  apiRequest: any;
  private logger: any;
  private defaultRequestOpts: any;

  constructor(conf: BusybeeParsedConfig, suiteEnvConf) {
    this.conf = _.cloneDeep(conf);
    this.suiteEnvConf = _.cloneDeep(suiteEnvConf);
    this.logger = new Logger(conf, this);
    const standardRequestOpts = {"json": true};
    this.defaultRequestOpts = Object.assign({}, standardRequestOpts, this.suiteEnvConf.defaultRequestOpts);
    this.apiRequest = request.defaults(this.defaultRequestOpts);

    // if (conf.debug) {
    //   this.apiRequest.debug = true;
    // }
  }

  getDefaultRequestOpts() {
    return Object.assign({}, this.defaultRequestOpts);
  }

  buildBaseUrl(requestConf, port) {
    this.logger.trace('buildBaseUrl');
    let protocol = this.suiteEnvConf.protocol;
    let hostName = this.suiteEnvConf.hostName;

    let url = `${protocol}://${hostName}`;
    if (port) {
      url += `:${port}`;
    }

    if (!_.isUndefined(requestConf.root)) {
      // allow override of root from requestConf
      if (requestConf.root != null) {
        url += requestConf.root;
      }
    }
    else if (this.suiteEnvConf.root) {
      // else use root from resApi conf
      url += this.suiteEnvConf.root;
    }

    return url;
  }

  buildRequest(requestConf: RequestOptsConfig, port: number) {
    this.logger.trace(`buildRequestUrl <requestConf> ${port}`);
    this.logger.trace(requestConf);

    let url = this.buildBaseUrl(requestConf, port);
    if (requestConf.endpoint) {
      if (requestConf.endpoint.startsWith("/")) {
        url += requestConf.endpoint;
      } else {
        url += `/${requestConf.endpoint}`;
      }
    }

    let req = {
      method: requestConf.method || 'GET',
      url: url,
      timeout: requestConf.timeout || 30000, // default 30 seconds
      resolveWithFullResponse: true, // don't resolve just the body
      simple: false // only reject() if the request fails for technical reasons (not status code other than 200).
    };

    if (requestConf.query) {
      req['qs'] = requestConf.query;
    }
    if (requestConf.headers) {
      req['headers'] = requestConf.headers;
    }
    if (requestConf.body) {
      req['body'] = requestConf.body;
    }

    return req;
  }


  makeRequest(opts) {
    // run the test
    this.logger.trace('Request opts');
    this.logger.trace(opts);
    return this.apiRequest(opts);
  }
}
