"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readLinesFromUrlInBatches = readLinesFromUrlInBatches;
const node_fetch_1 = __importDefault(require("node-fetch"));
const readline = __importStar(require("readline"));
async function readLinesFromUrlInBatches(url, batchSize, fn) {
    const response = await (0, node_fetch_1.default)(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch the file: ${response.statusText}`);
    }
    const stream = response.body;
    const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity, // Handle different newline characters correctly
    });
    let batch = [];
    for await (const line of rl) {
        batch.push(line);
        if (batch.length === batchSize) {
            await fn(batch);
            batch = [];
        }
    }
    if (batch.length > 0) {
        await fn(batch);
    }
}
//# sourceMappingURL=readLinesFromUrlInBatches.js.map