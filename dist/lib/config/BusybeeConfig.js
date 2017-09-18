"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var TestSuiteConfig_1 = require("./models/TestSuiteConfig");
var EnvResourceConfig_1 = require("./models/EnvResourceConfig");
var json_typescript_mapper_1 = require("json-typescript-mapper");
var BusybeeConfig = /** @class */ (function () {
    function BusybeeConfig() {
    }
    __decorate([
        json_typescript_mapper_1.JsonProperty({ clazz: EnvResourceConfig_1.EnvResourceConfig, name: 'envResources' })
    ], BusybeeConfig.prototype, "envResources", void 0);
    __decorate([
        json_typescript_mapper_1.JsonProperty({ clazz: TestSuiteConfig_1.TestSuiteConfig, name: 'testSuites' })
    ], BusybeeConfig.prototype, "testSuites", void 0);
    return BusybeeConfig;
}());
exports.BusybeeConfig = BusybeeConfig;
//# sourceMappingURL=BusybeeConfig.js.map