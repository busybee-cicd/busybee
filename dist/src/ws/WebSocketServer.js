"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ws_1 = require("ws");
var busybee_util_1 = require("busybee-util");
var WebSocketServer = /** @class */ (function () {
    function WebSocketServer(conf) {
        var _this = this;
        var loggerConf = new busybee_util_1.LoggerConf(this, conf.logLevel, null);
        this.logger = new busybee_util_1.Logger(loggerConf);
        this.wss = new ws_1.Server({ port: conf.port });
        this.logger.info("wss running at " + conf.port);
        this.wss.on('connection', function (ws) {
            _this.logger.info('client connected!');
        });
    }
    WebSocketServer.prototype.broadcast = function (data) {
        this.logger.info('broadcasting...');
        this.wss.clients.forEach(function each(client) {
            if (client.readyState === ws_1.OPEN) {
                client.send(data);
            }
        });
    };
    return WebSocketServer;
}());
exports.WebSocketServer = WebSocketServer;
//# sourceMappingURL=WebSocketServer.js.map