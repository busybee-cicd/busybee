"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var EnvInstanceConfig_1 = require("./EnvInstanceConfig");
var json_typescript_mapper_1 = require("json-typescript-mapper");
var TestSuiteConfig = /** @class */ (function () {
    function TestSuiteConfig() {
    }
    __decorate([
        json_typescript_mapper_1.JsonProperty({ clazz: EnvInstanceConfig_1.EnvInstanceConfig, name: 'envInstances' })
    ], TestSuiteConfig.prototype, "envInstances", void 0);
    return TestSuiteConfig;
}());
exports.TestSuiteConfig = TestSuiteConfig;
//# sourceMappingURL=TestSuiteConfig.js.map