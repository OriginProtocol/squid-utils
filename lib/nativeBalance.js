"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNativeBalances = exports.getNativeBalance = void 0;
const viem_1 = require("viem");
const getNativeBalance = async (ctx, address, block) => {
    return await ctx._chain.client
        .call('eth_getBalance', [address, block.header.hash])
        .then((r) => (0, viem_1.hexToBigInt)(r));
};
exports.getNativeBalance = getNativeBalance;
const getNativeBalances = async (ctx, addresses, block) => {
    if (!addresses.length)
        return [];
    return await ctx._chain.client
        .batchCall(addresses.map((address) => ({
        method: 'eth_getBalance',
        params: [address, block.header.hash],
    })))
        .then((rs) => rs.map((r) => (0, viem_1.hexToBigInt)(r)));
};
exports.getNativeBalances = getNativeBalances;
//# sourceMappingURL=nativeBalance.js.map