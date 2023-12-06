var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define(["require", "exports", "system_lib/Metadata", "system_lib/Script", "system/SimpleFile"], function (require, exports, Metadata_1, Script_1, SimpleFile_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var SnapValue = (function (_super) {
        __extends(SnapValue, _super);
        function SnapValue(env) {
            var _this = _super.call(this, env) || this;
            _this.readJsonFiles();
            return _this;
        }
        SnapValue.prototype.reload = function () {
            this.readJsonFiles();
        };
        SnapValue.prototype.readJsonFiles = function () {
            var _this = this;
            SimpleFile_1.SimpleFile.read(SnapValue.kFileName).then(function (data) {
                var _a;
                try {
                    _this.data = JSON.parse(data);
                    _this.mPersistent = (_a = _this.data['persistent']) !== null && _a !== void 0 ? _a : false;
                }
                catch (parseError) {
                    console.error("Failed parsing JSON data from init file", SnapValue.kFileName, parseError);
                }
            }).catch(function (error) {
                console.error("Failed reading init file; use initial sample data", SnapValue.kFileName, error);
                _this.data = {
                    "persistent": false,
                    "value1": {
                        'initValue': 25,
                        'snapSize': 10,
                        'snapValues': [
                            500, 1670, 1850
                        ],
                        "precision": 0,
                    }
                };
                _this.mPersistent = false;
            }).finally(function () {
                _this.publishProperties();
                if (_this.mPersistent) {
                    SimpleFile_1.SimpleFile.read(SnapValue.kPersistentFileName).then(function (data) {
                        try {
                            _this.values = JSON.parse(data);
                        }
                        catch (parseError) {
                            console.error("Failed parsing JSON data from persistent file", SnapValue.kPersistentFileName, parseError);
                            _this.initValues();
                        }
                    }).catch(function (error) {
                        console.error("Failed reading persistent file; use initial values", SnapValue.kPersistentFileName, error);
                        _this.initValues();
                    });
                }
                else {
                    _this.initValues();
                }
            });
        };
        SnapValue.prototype.initValues = function () {
            this.values = new Array();
            for (var key in this.data) {
                if (key == "persistent")
                    continue;
                this.values[key] = this.data[key]["initValue"];
            }
            this.persistVars();
        };
        SnapValue.prototype.publishProperties = function () {
            for (var key in this.data) {
                var propData = this.data[key];
                var typeName = typeof propData;
                if (key == "persistent")
                    continue;
                if (typeName === 'object') {
                    this.makeProperties(key);
                }
                else
                    console.error("Invalid type of ", key, typeName);
            }
        };
        SnapValue.prototype.makeProperties = function (name) {
            var _this = this;
            try {
                this.property(name, { type: Number }, function (value) {
                    var _a;
                    if (value !== undefined && value !== _this.data[name]) {
                        var precision = (_a = _this.data[name]['precision']) !== null && _a !== void 0 ? _a : 0;
                        _this.values[name] = Number(value).toFixed(precision);
                        _this.changed(name + 'Snap');
                        _this.persistVars();
                    }
                    return _this.values[name];
                });
                this.property(name + "Snap", { type: Number, readOnly: true }, function () {
                    var _a;
                    var currValue = _this.values[name];
                    var size = _this.data[name]['snapSize'];
                    var values = _this.data[name]['snapValues'];
                    var precision = (_a = _this.data[name]['precision']) !== null && _a !== void 0 ? _a : 0;
                    for (var i = 0; i < values.length; i++) {
                        var val = Number(values[i]);
                        if (val - size < currValue && val + size > currValue)
                            return val.toFixed(precision);
                    }
                    return Number(_this.values[name]).toFixed(precision);
                });
            }
            catch (error) {
                console.warn("Already initialized property " + name);
            }
        };
        SnapValue.prototype.persistVars = function () {
            var _this = this;
            if (!this.mPersistent)
                return;
            if (!this.mPersistor) {
                this.mPersistor = wait(200);
                this.mPersistor.then(function () {
                    delete _this.mPersistor;
                    var jsonData = JSON.stringify(_this.values, null, 2);
                    SimpleFile_1.SimpleFile.write(SnapValue.kPersistentFileName, jsonData);
                });
            }
        };
        SnapValue.kFileName = "SnapValue.json";
        SnapValue.kPersistentFileName = "SnapValuePersistent.json";
        __decorate([
            Metadata_1.callable("Reload settings from JSON file"),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], SnapValue.prototype, "reload", null);
        return SnapValue;
    }(Script_1.Script));
    exports.SnapValue = SnapValue;
});
