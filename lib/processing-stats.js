"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printStats = exports.processingStats = void 0;
exports.processingStats = {
    rpcCalls: 0,
    rpcCallTime: 0,
    rpcCallTypes: new Map(),
    totalCUCost: 0,
    rpcCUCosts: new Map(),
};
const printStats = (ctx) => {
    if (process.env.DEBUG_PERF === 'true') {
        // Convert Maps to objects for logging
        const callTypes = Object.fromEntries(exports.processingStats.rpcCallTypes);
        const cuCosts = Object.fromEntries(exports.processingStats.rpcCUCosts);
        // Calculate top CU-consuming methods
        const topCUMethods = Array.from(exports.processingStats.rpcCUCosts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([method, cost]) => ({ method, cost }));
        ctx.log.info({
            rpcStats: {
                totalCalls: exports.processingStats.rpcCalls,
                totalCUCost: exports.processingStats.totalCUCost,
                averageRpcCallTime: exports.processingStats.rpcCallTime / exports.processingStats.rpcCalls,
                callTypes,
                cuCosts,
                topCUMethods,
            },
            blockStats: {
                blockCount: ctx.blocks.length,
                blockCountWithContent: ctx.blocksWithContent.length,
                frequencyBlockCount: ctx.frequencyBlocks.length,
                logCount: ctx.blocks.reduce((sum, block) => sum + block.logs.length, 0),
                traceCount: ctx.blocks.reduce((sum, block) => sum + block.traces.length, 0),
                transactionCount: ctx.blocks.reduce((sum, block) => sum + block.transactions.length, 0),
            }
        });
    }
    exports.processingStats.rpcCalls = 0;
    exports.processingStats.rpcCallTime = 0;
    exports.processingStats.rpcCallTypes.clear();
    exports.processingStats.totalCUCost = 0;
    exports.processingStats.rpcCUCosts.clear();
};
exports.printStats = printStats;
//# sourceMappingURL=processing-stats.js.map