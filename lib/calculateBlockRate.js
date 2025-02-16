"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBlockRate = void 0;
const chains_1 = require("viem/chains");
const blockRates = {
    [chains_1.mainnet.id]: 12.04,
    [chains_1.arbitrum.id]: 0.25,
    [chains_1.base.id]: 2,
    [chains_1.sonic.id]: 0.6,
    [chains_1.optimism.id]: 2,
    [chains_1.bsc.id]: 3,
};
const calculateBlockRate = async (ctx) => {
    const rate = blockRates[ctx.chain.id];
    if (rate) {
        return rate;
    }
    throw new Error('No block rate found');
};
exports.calculateBlockRate = calculateBlockRate;
//# sourceMappingURL=calculateBlockRate.js.map