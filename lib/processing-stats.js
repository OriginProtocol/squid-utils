"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printStats = exports.processingStats = void 0;
exports.processingStats = {
    rpcCalls: 0,
    rpcCallTime: 0,
    rpcCallTypes: new Map(),
};
const printStats = (ctx) => {
    if (process.env.DEBUG_PERF === 'true') {
        ctx.log.info({
            ...exports.processingStats,
            averageRpcCallTime: exports.processingStats.rpcCallTime / exports.processingStats.rpcCalls,
            blockCount: ctx.blocks.length,
            blockCountWithContent: ctx.blocksWithContent.length,
            frequencyBlockCount: ctx.frequencyBlocks.length,
            logCount: ctx.blocks.reduce((sum, block) => sum + block.logs.length, 0),
            traceCount: ctx.blocks.reduce((sum, block) => sum + block.traces.length, 0),
            transactionCount: ctx.blocks.reduce((sum, block) => sum + block.transactions.length, 0),
        });
    }
    exports.processingStats.rpcCalls = 0;
    exports.processingStats.rpcCallTime = 0;
    exports.processingStats.rpcCallTypes.clear();
};
exports.printStats = printStats;
//# sourceMappingURL=processing-stats.js.map