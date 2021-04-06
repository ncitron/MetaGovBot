var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "ethers", "../utils/postToDiscord", "../utils/postToSnapshot"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.watchCompound = void 0;
    var ethers_1 = require("ethers");
    var postToDiscord_1 = require("../utils/postToDiscord");
    var postToSnapshot_1 = require("../utils/postToSnapshot");
    require("dotenv").config();
    var watchCompound = function () {
        var provider = new ethers_1.ethers.providers.JsonRpcProvider(process.env.ALCHEMY_URL);
        var signer = new ethers_1.Wallet(process.env.PRIV_KEY, provider);
        var spaceName = process.env.SPACE_NAME;
        var webhook = process.env.DISCORD_WEBHOOK;
        var eventSignature = "ProposalCreated(uint256,address,address[],uint256[],string[],bytes[],uint256,uint256,string)";
        var eventReadable = ["event ProposalCreated(uint id, address proposer, address[] targets, uint[] values, string[] signatures, bytes[] calldatas, uint startBlock, uint endBlock, string description)"];
        var filter = {
            address: process.env.COMPOUND_BRAVO_ADDRESS,
            topics: [
                ethers_1.ethers.utils.id(eventSignature)
            ]
        };
        provider.on(filter, function (log, _) { return __awaiter(void 0, void 0, void 0, function () {
            var iface, decodedEvent, id, endBlock, desc, ipfsHash;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        iface = new ethers_1.ethers.utils.Interface(eventReadable);
                        decodedEvent = iface.decodeEventLog("ProposalCreated", log.data);
                        id = decodedEvent.id.toNumber();
                        endBlock = decodedEvent.endBlock.toNumber();
                        desc = decodedEvent.description;
                        return [4 /*yield*/, makeCompSnapshot(signer, id, desc, endBlock, spaceName)];
                    case 1:
                        ipfsHash = _a.sent();
                        return [4 /*yield*/, messageDiscord(ipfsHash, id, desc, spaceName, webhook)];
                    case 2:
                        _a.sent();
                        console.log(ipfsHash);
                        return [2 /*return*/];
                }
            });
        }); });
    };
    exports.watchCompound = watchCompound;
    var makeCompSnapshot = function (signer, id, desc, endBlock, spaceName) { return __awaiter(void 0, void 0, void 0, function () {
        var description, title;
        return __generator(this, function (_a) {
            description = "This proposal is for voting on Compound's proposal #" + id + " using DPI. Please review the proposal here: https://compound.finance/governance/proposals/" + id;
            title = "[COMPOUND-" + id + "] " + desc.split("#")[1].trim();
            return [2 /*return*/, postToSnapshot_1.default(signer, title, description, endBlock, spaceName)];
        });
    }); };
    var messageDiscord = function (ipfsHash, id, desc, spaceName, webhook) { return __awaiter(void 0, void 0, void 0, function () {
        var message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    message = "A new proposal has been created for [COMPOUND-" + id + "] " + desc.split("#")[1].trim() + ". This proposal is for voting on Compound's proposal #" + id + " using DPI. Please review the proposal here: https://snapshot.org/#/" + spaceName + "/proposal/" + ipfsHash;
                    return [4 /*yield*/, postToDiscord_1.default(message, webhook)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); };
});
//# sourceMappingURL=compound.js.map