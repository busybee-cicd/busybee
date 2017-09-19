var ParsedTestSuiteMap = /** @class */ (function () {
    function ParsedTestSuiteMap() {
        this._keys = [];
        this._values = [];
    }
    ParsedTestSuiteMap.prototype.set = function (key, value) {
        var index = this._keys.indexOf(key);
        if (index == -1) {
            this._values[this._keys.length] = value;
            this._keys.push(key);
        }
        else {
            this._values[index] = value;
        }
    };
    ParsedTestSuiteMap.prototype.get = function (key) {
        var index = this._keys.indexOf(key);
        if (index === -1) {
            return null;
        }
        return this._values[index];
    };
    ParsedTestSuiteMap.prototype.keys = function () {
        return this._keys;
    };
    ParsedTestSuiteMap.prototype.values = function () {
        return this._values;
    };
    ParsedTestSuiteMap.prototype.remove = function (key) {
        var index = this._keys.indexOf(key);
        if (index === -1) {
            return;
        }
        this._keys.splice(index, 1);
        this._values.splice(index, 1);
    };
    return ParsedTestSuiteMap;
}());
//# sourceMappingURL=Map.js.map