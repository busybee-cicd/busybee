"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var WebSocketServer_1 = require("./WebSocketServer");
var busybee_util_1 = require("busybee-util");
var MessageTypes_1 = require("./MessageTypes");
var TestWebSocketServer = /** @class */ (function (_super) {
    __extends(TestWebSocketServer, _super);
    function TestWebSocketServer(conf, envManager) {
        var _this = _super.call(this, conf) || this;
        _this.envManager = envManager;
        var loggerConf = new busybee_util_1.LoggerConf(_this, conf.logLevel, null);
        _this.logger = new busybee_util_1.Logger(loggerConf);
        setInterval(_this.emitStatus.bind(_this), 5000);
        return _this;
    }
    TestWebSocketServer.prototype.emitStatus = function () {
        this.logger.debug('emitStatus');
        var msg = {
            type: MessageTypes_1.MessageTypes.TEST_RUN_STATUS,
            data: {
                envs: this.envManager.getCurrentEnvs(),
                hosts: this.envManager.getCurrentHosts()
            }
        };
        this.logger.trace(msg);
        this.broadcast(JSON.stringify(msg));
    };
    return TestWebSocketServer;
}(WebSocketServer_1.WebSocketServer));
exports.TestWebSocketServer = TestWebSocketServer;
//# sourceMappingURL=TestWebSocketServer.js.map