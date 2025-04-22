import { Context } from './types';

export const processingStats = {
  rpcCalls: 0,
  rpcCallTime: 0,
  rpcCallTypes: new Map<string, number>(),
  totalCUCost: 0,
  rpcCUCosts: new Map<string, number>(),
  ethCallCounts: new Map<string, number>(),
}

export const printStats = (ctx: Context) => {
  if (process.env.DEBUG_PERF === 'true') {
    // Convert Maps to objects for logging
    const callTypes = Object.fromEntries(processingStats.rpcCallTypes);
    const cuCosts = Object.fromEntries(processingStats.rpcCUCosts);
    
    // Calculate top CU-consuming methods
    const topCUMethods = Array.from(processingStats.rpcCUCosts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([method, cost]) => ({ method, cost }));

    ctx.log.info({
      rpcStats: {
        totalCalls: processingStats.rpcCalls,
        totalCUCost: processingStats.totalCUCost,
        averageRpcCallTime: processingStats.rpcCallTime / processingStats.rpcCalls,
        callTypes,
        cuCosts,
        topCUMethods,
      },
      ethCallStats: {
        top5: Array.from(processingStats.ethCallCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([method, count]) => ({ method, count }))
      },
      blockStats: {
        blockCount: ctx.blocks.length,
        blockCountWithContent: ctx.blocksWithContent.length,
        frequencyBlockCount: ctx.frequencyBlocks.length,
        logCount: ctx.blocks.reduce((sum, block) => sum + block.logs.length, 0),
        traceCount: ctx.blocks.reduce((sum, block) => sum + block.traces.length, 0),
        transactionCount: ctx.blocks.reduce((sum, block) => sum + block.transactions.length, 0),
      }
    })
  }
  // processingStats.rpcCalls = 0
  // processingStats.rpcCallTime = 0
  // processingStats.rpcCallTypes.clear()
  // processingStats.totalCUCost = 0
  // processingStats.rpcCUCosts.clear()
}
