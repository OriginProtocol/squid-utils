"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multicall = void 0;
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const multicall_1 = require("./abi/multicall");
const MULTICALL_CONTRACTS = {
    [chains_1.mainnet.id]: {
        from: 12336033,
        address: '0x5ba1e12693dc8f9c48aad8770482f4739beed696',
    },
    [chains_1.arbitrum.id]: {
        from: 821923,
        address: '0x842ec2c7d803033edf55e478f461fc547bc54eb2',
    },
};
const multicall = async (ctx, header, func, address, calls, throttle = 50) => {
    const results = [];
    const pendingCalls = [...calls];
    while (pendingCalls.length > 0) {
        const callsToMake = pendingCalls.splice(0, throttle);
        const multicallContract = MULTICALL_CONTRACTS[ctx.chain.id];
        if (multicallContract && header.height >= multicallContract.from) {
            const multicall = new multicall_1.Multicall(ctx, header, multicallContract.address);
            const response = await multicall.aggregate(func, address, callsToMake);
            results.push(...response);
        }
        else {
            const batchCalls = callsToMake.map((fnParams) => ({
                method: 'eth_call',
                params: [{ to: address, data: func.encode(fnParams) }, (0, viem_1.toHex)(header.height)],
            }));
            const response = await ctx._chain.client.batchCall(batchCalls);
            results.push(...response.map((r) => func.decodeResult(r)));
        }
    }
    return results;
};
exports.multicall = multicall;
//# sourceMappingURL=multicall.js.map