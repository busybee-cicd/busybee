import * as _ from 'lodash';
import { Logger, LoggerConf } from 'busybee-util';
import { RequestOptsConfig } from '../models/config/common/RequestOptsConfig';
import { BusybeeParsedConfig } from '../models/config/BusybeeParsedConfig';

export class RESTClient {
  conf: BusybeeParsedConfig;
  suiteEnvConf: any;
  private logger: any;
  private defaultRequestOpts: any;

  constructor(conf: BusybeeParsedConfig, suiteEnvConf) {
    this.conf = _.cloneDeep(conf);
    this.suiteEnvConf = _.cloneDeep(suiteEnvConf);
    const loggerConf = new LoggerConf(this, conf.logLevel, null);
    this.logger = new Logger(loggerConf);
    this.defaultRequestOpts = Object.assign(
      { timeout: 30000 },
      this.suiteEnvConf.defaultRequestOpts,
    );
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
    } else if (this.suiteEnvConf.root) {
      // else use root from resApi conf
      url += this.suiteEnvConf.root;
    }

    return url;
  }

  buildRequest(requestConf: RequestOptsConfig, port: number) {
    this.logger.trace(`buildRequestUrl <requestConf> ${port}`);
    this.logger.trace(requestConf);

    let url = this.buildBaseUrl(requestConf, port);
    if (requestConf.path) {
      if (requestConf.path.startsWith('/')) {
        url += requestConf.path;
      } else {
        url += `/${requestConf.path}`;
      }
    }

    let req = {
      method: requestConf.method || 'GET',
      url: url,
      timeout: requestConf.timeout || 30000, // default 30 seconds
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

  async makeRequest(opts) {
    this.logger.trace('Request opts');
    this.logger.trace(opts);

    const url = new URL(opts.url);
    if (opts.qs) {
      Object.entries(opts.qs).forEach(([k, v]) =>
        url.searchParams.set(k, String(v)),
      );
    }

    const headers: Record<string, string> = Object.assign(
      {},
      this.defaultRequestOpts.headers,
      opts.headers,
    );

    let body: string | undefined;
    if (opts.body !== undefined) {
      body = JSON.stringify(opts.body);
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    const timeout = opts.timeout || this.defaultRequestOpts.timeout || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        method: opts.method || 'GET',
        headers,
        body,
        signal: controller.signal,
      });

      let responseBody: any;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, name) => {
        responseHeaders[name] = value;
      });

      return {
        statusCode: response.status,
        body: responseBody,
        headers: responseHeaders,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
