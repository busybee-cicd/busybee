"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var IOUtil = /** @class */ (function () {
    function IOUtil() {
    }
    IOUtil.parseDataBuffer = function (dataBuffer) {
        var dataStr = dataBuffer.toString();
        dataStr = IOUtil.trimChars(dataStr, '\n');
        return dataStr.split('\n');
    };
    IOUtil.trimChars = function (s, c) {
        if (c === "]")
            c = "\\]";
        if (c === "\\")
            c = "\\\\";
        return s.replace(new RegExp("^[" + c + "]+|[" + c + "]+$", "g"), "");
    };
    return IOUtil;
}());
exports.IOUtil = IOUtil;
//# sourceMappingURL=IOUtil.js.map