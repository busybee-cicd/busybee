"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var request = require("request");
var _ = require("lodash");
var Logger_1 = require("./Logger");
var RESTClient = /** @class */ (function () {
    function RESTClient(conf, suiteEnvConf) {
        this.conf = conf;
        this.suiteEnvConf = Object.assign({}, suiteEnvConf);
        this.logger = new Logger_1.Logger(conf, this);
        var standardRequestOpts = { "json": true };
        this.defaultRequestOpts = Object.assign({}, standardRequestOpts, this.suiteEnvConf.defaultRequestOpts);
        this.apiRequest = request.defaults(this.defaultRequestOpts);
        if (conf.debug) {
            this.apiRequest.debug = true;
        }
    }
    RESTClient.prototype.getDefaultRequestOpts = function () {
        return Object.assign({}, this.defaultRequestOpts);
    };
    RESTClient.prototype.buildBaseUrl = function (requestConf, port) {
        this.logger.trace('buildBaseUrl');
        var protocol = this.suiteEnvConf.protocol;
        var hostName = this.suiteEnvConf.hostName;
        var url = protocol + "://" + hostName;
        if (port) {
            url += ":" + port;
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
    };
    RESTClient.prototype.buildRequest = function (requestConf, port) {
        this.logger.trace("buildRequestUrl <requestConf> " + port);
        this.logger.trace(requestConf);
        var url = this.buildBaseUrl(requestConf, port);
        if (requestConf.endpoint) {
            if (requestConf.endpoint.startsWith("/")) {
                url += requestConf.endpoint;
            }
            else {
                url += "/" + requestConf.endpoint;
            }
        }
        var req = {
            method: requestConf.method || 'GET',
            url: url,
            timeout: requestConf.timeout || 30000 // default 30 seconds
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
    };
    RESTClient.prototype.makeRequest = function (opts, cb) {
        // run the test
        this.logger.trace('Request opts');
        this.logger.trace(opts);
        this.apiRequest(opts, cb);
    };
    return RESTClient;
}());
exports.RESTClient = RESTClient;
//# sourceMappingURL=RESTClient.js.map