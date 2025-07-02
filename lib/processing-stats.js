"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetStats = exports.printStats = exports.processingStats = void 0;
exports.processingStats = {
    rpcCalls: 0,
    rpcCallTime: 0,
    rpcCallTypes: new Map(),
    ethCallCounts: new Map(),
    // Block rate tracking
    processingStartTime: Date.now(),
    lastResetTime: Date.now(),
    // Network block rate tracking
    startBlockHeight: null,
    startBlockTime: null,
    currentBlockHeight: null,
    currentBlockTime: null,
};
const calculateBlockRateAverages = (ctx) => {
    if (ctx.blocks.length > 0) {
        // Track the first block we process
        if (exports.processingStats.startBlockHeight === null) {
            const firstBlock = ctx.blocks[0];
            exports.processingStats.startBlockHeight = firstBlock.header.height;
            exports.processingStats.startBlockTime = firstBlock.header.timestamp;
        }
        // Always update current block info
        const lastBlock = ctx.blocks[ctx.blocks.length - 1];
        exports.processingStats.currentBlockHeight = lastBlock.header.height;
        exports.processingStats.currentBlockTime = lastBlock.header.timestamp;
    }
    // Calculate total blocks processed from height difference
    const totalBlocksProcessed = exports.processingStats.startBlockHeight !== null && exports.processingStats.currentBlockHeight !== null
        ? exports.processingStats.currentBlockHeight - exports.processingStats.startBlockHeight + 1
        : 0;
    // Calculate actual network block production rate
    let blocksPerSecond = 0;
    let blocksPerDay = 0;
    let blocksPerMonth = 0;
    if (exports.processingStats.startBlockHeight !== null &&
        exports.processingStats.currentBlockHeight !== null &&
        exports.processingStats.startBlockTime !== null &&
        exports.processingStats.currentBlockTime !== null) {
        const heightDiff = exports.processingStats.currentBlockHeight - exports.processingStats.startBlockHeight;
        const timeDiffSeconds = (exports.processingStats.currentBlockTime - exports.processingStats.startBlockTime) / 1000;
        if (timeDiffSeconds > 0 && heightDiff > 0) {
            blocksPerSecond = heightDiff / timeDiffSeconds;
            blocksPerDay = blocksPerSecond * 24 * 60 * 60;
            blocksPerMonth = blocksPerDay * 30; // Rough estimate
        }
    }
    return {
        networkBlocksPerSecond: blocksPerSecond,
        blocksPerDay,
        blocksPerMonth,
        totalBlocksProcessed,
        heightRange: exports.processingStats.startBlockHeight !== null && exports.processingStats.currentBlockHeight !== null
            ? `${exports.processingStats.startBlockHeight} -> ${exports.processingStats.currentBlockHeight}`
            : 'N/A',
    };
};
const calculateRpcStatsPerBlock = (ctx) => {
    const totalBlocksProcessed = exports.processingStats.startBlockHeight !== null && exports.processingStats.currentBlockHeight !== null
        ? exports.processingStats.currentBlockHeight - exports.processingStats.startBlockHeight + 1
        : 0;
    if (totalBlocksProcessed === 0)
        return {};
    const rpcCallsPerBlock = exports.processingStats.rpcCalls / totalBlocksProcessed;
    const avgRpcCallTypesPerBlock = exports.processingStats.rpcCallTypes.size > 0
        ? Array.from(exports.processingStats.rpcCallTypes.values()).reduce((sum, count) => sum + count, 0) / totalBlocksProcessed
        : 0;
    return {
        rpcCallsPerBlock,
        avgRpcCallTypesPerBlock,
        uniqueRpcCallTypes: exports.processingStats.rpcCallTypes.size,
    };
};
const printStats = (ctx) => {
    // Check environment flags for what to display
    const showRpcStats = process.env.DEBUG_RPC === 'true' || process.env.DEBUG_PERF === 'true';
    const showBlockStats = process.env.DEBUG_BLOCKS === 'true' || process.env.DEBUG_PERF === 'true';
    const showBlockRates = process.env.DEBUG_RATES === 'true' || process.env.DEBUG_PERF === 'true';
    const showEthCalls = process.env.DEBUG_ETH_CALLS === 'true' || process.env.DEBUG_PERF === 'true';
    const showAll = process.env.DEBUG_PERF === 'true';
    if (!showAll && !showRpcStats && !showBlockStats && !showBlockRates && !showEthCalls) {
        return; // Nothing to show
    }
    const blockRateStats = calculateBlockRateAverages(ctx);
    const rpcPerBlockStats = calculateRpcStatsPerBlock(ctx);
    const statsToLog = {};
    if (showRpcStats || showAll) {
        // Convert Maps to objects for logging
        const callTypes = Object.fromEntries(exports.processingStats.rpcCallTypes);
        // Calculate top RPC methods by call count
        const topRpcMethods = Array.from(exports.processingStats.rpcCallTypes.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([method, count]) => ({ method, count }));
        statsToLog.rpcStats = {
            totalCalls: exports.processingStats.rpcCalls,
            averageRpcCallTime: exports.processingStats.rpcCalls > 0 ? exports.processingStats.rpcCallTime / exports.processingStats.rpcCalls : 0,
            ...rpcPerBlockStats,
            ...(showAll ? { callTypes } : {}),
            topRpcMethods,
        };
    }
    if (showEthCalls || showAll) {
        statsToLog.ethCallStats = {
            top5: Array.from(exports.processingStats.ethCallCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([method, count]) => ({ method, count }))
        };
    }
    if (showBlockStats || showAll) {
        statsToLog.blockStats = {
            blockCount: ctx.blocks.length,
            blockCountWithContent: ctx.blocksWithContent.length,
            frequencyBlockCount: ctx.frequencyBlocks.length,
            logCount: ctx.blocks.reduce((sum, block) => sum + block.logs.length, 0),
            traceCount: ctx.blocks.reduce((sum, block) => sum + block.traces.length, 0),
            transactionCount: ctx.blocks.reduce((sum, block) => sum + block.transactions.length, 0),
        };
    }
    if (showBlockRates || showAll) {
        const elapsedTimeSeconds = (Date.now() - exports.processingStats.processingStartTime) / 1000;
        const processingBlocksPerSecond = elapsedTimeSeconds > 0 && blockRateStats.totalBlocksProcessed > 0
            ? blockRateStats.totalBlocksProcessed / elapsedTimeSeconds
            : 0;
        statsToLog.blockRateStats = {
            ...blockRateStats,
            processingBlocksPerSecond,
            elapsedTimeSeconds,
            estimatedTimeToSync: blockRateStats.networkBlocksPerSecond > processingBlocksPerSecond && processingBlocksPerSecond > 0
                ? `${((blockRateStats.networkBlocksPerSecond - processingBlocksPerSecond) / processingBlocksPerSecond * elapsedTimeSeconds / 3600).toFixed(2)} hours`
                : 'N/A',
        };
    }
    if (Object.keys(statsToLog).length > 0) {
        ctx.log.info(statsToLog);
    }
    // Optional: Reset stats periodically to avoid memory buildup
    if (process.env.RESET_STATS_INTERVAL && Date.now() - exports.processingStats.lastResetTime > Number(process.env.RESET_STATS_INTERVAL) * 1000) {
        (0, exports.resetStats)();
    }
};
exports.printStats = printStats;
const resetStats = () => {
    exports.processingStats.rpcCalls = 0;
    exports.processingStats.rpcCallTime = 0;
    exports.processingStats.rpcCallTypes.clear();
    exports.processingStats.ethCallCounts.clear();
    exports.processingStats.lastResetTime = Date.now();
    exports.processingStats.startBlockHeight = null;
    exports.processingStats.startBlockTime = null;
    exports.processingStats.currentBlockHeight = null;
    exports.processingStats.currentBlockTime = null;
};
exports.resetStats = resetStats;
//# sourceMappingURL=processing-stats.js.map