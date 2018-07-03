"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var IOHelper = /** @class */ (function () {
    function IOHelper() {
    }
    IOHelper.parseDataBuffer = function (dataBuffer) {
        var dataStr = dataBuffer.toString();
        dataStr = IOHelper.trimChars(dataStr, '\n');
        return dataStr.split('\n');
    };
    IOHelper.trimChars = function (s, c) {
        if (c === "]")
            c = "\\]";
        if (c === "\\")
            c = "\\\\";
        return s.replace(new RegExp("^[" + c + "]+|[" + c + "]+$", "g"), "");
    };
    return IOHelper;
}());
exports.IOHelper = IOHelper;
//# sourceMappingURL=IOHelper.js.map