let request = require('request');
const _async = require('async');
const _ = require('lodash');
const Logger = require('./logger');

class RESTClient {
  constructor(conf, suiteEnvConf) {
    this.conf = conf;
    this.suiteEnvConf = suiteEnvConf;
    this.logger = new Logger(conf, this);
    this.apiRequest = request;
    if (suiteEnvConf.defaultRequestOpts)
      this.apiRequest = request.defaults(suiteEnvConf.defaultRequestOpts);

    if (conf.debug) {
      this.apiRequest.debug = true;
    }
  }

  buildBaseUrl(requestConf, port) {
    this.logger.debug('buildBaseUrl');
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

  buildRequest(requestConf, port) {
    this.logger.debug(`buildRequestUrl <requestConf> ${port}`);
    this.logger.debug(requestConf);

    let url = this.buildBaseUrl(requestConf, port);
    if (requestConf.endpoint) {
      if (requestConf.endpoint.startsWith("/")) {
        url += requestConf.endpoint;
      } else {
        url += `/${requestConf.endpoint}`;
      }
    }

    let req = {
      method: requestConf.method,
      url: url,
      qs: requestConf.query,
      headers: requestConf.headers,
      body: requestConf.body,
      timeout: requestConf.timeout || 30000 // default 30 seconds
    };

    return req;
  }

  makeRequest(opts, cb) {
    // run the test
    this.logger.debug('Request opts');
    this.logger.debug(opts);
    this.apiRequest(opts, cb);
  }
}

module.exports = RESTClient;
