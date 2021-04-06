(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./protocols/aave", "./protocols/compound"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var aave_1 = require("./protocols/aave");
    var compound_1 = require("./protocols/compound");
    compound_1.watchCompound();
    aave_1.watchAave();
    console.log("watching for new proposals...");
});
//# sourceMappingURL=index.js.map