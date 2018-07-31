"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var TypedMap = /** @class */ (function () {
    function TypedMap() {
        this._keys = [];
        this._values = [];
    }
    TypedMap.prototype.set = function (key, value) {
        var index = this._keys.indexOf(key);
        if (index == -1) {
            this._values[this._keys.length] = value;
            this._keys.push(key);
        }
        else {
            this._values[index] = value;
        }
    };
    TypedMap.prototype.get = function (key) {
        var index = this._keys.indexOf(key);
        if (index === -1) {
            return null;
        }
        return this._values[index];
    };
    TypedMap.prototype.keys = function () {
        return this._keys;
    };
    TypedMap.prototype.values = function () {
        return this._values;
    };
    TypedMap.prototype.remove = function (key) {
        var index = this._keys.indexOf(key);
        if (index === -1) {
            return;
        }
        this._keys.splice(index, 1);
        this._values.splice(index, 1);
    };
    TypedMap.prototype.toJSON = function () {
        var _this = this;
        var ret = {};
        this._keys.forEach(function (k, i) {
            ret[k] = _this._values[i];
        });
        return ret;
    };
    TypedMap.prototype.forEach = function (fn) {
        var _this = this;
        this._keys.forEach(function (k, i) {
            fn(_this._values[i], k);
        });
    };
    return TypedMap;
}());
exports.TypedMap = TypedMap;
//# sourceMappingURL=TypedMap.js.map