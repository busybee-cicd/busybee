"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var HostConfig_1 = require("./HostConfig");
var json_typescript_mapper_1 = require("json-typescript-mapper");
var EnvResourceConfig = /** @class */ (function () {
    function EnvResourceConfig() {
    }
    __decorate([
        json_typescript_mapper_1.JsonProperty({ clazz: HostConfig_1.HostConfig, name: 'hosts' })
    ], EnvResourceConfig.prototype, "hosts", void 0);
    return EnvResourceConfig;
}());
exports.EnvResourceConfig = EnvResourceConfig;
//# sourceMappingURL=EnvResourceConfig.js.map