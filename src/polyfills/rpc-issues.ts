// Fix RPC issues
// import * as fs from 'node:fs'
import { CallOptions, RpcClient } from '@subsquid/rpc-client';
import { RpcCall } from '@subsquid/rpc-client/src/interfaces';
import { DEFAULT_CU_COST, RPC_CU_COSTS } from '../constants/rpc-cu-costs';
import { processingStats } from '../processing-stats';

(RpcClient.prototype as any)._call = RpcClient.prototype.call
;(RpcClient.prototype as any)._batchCall = RpcClient.prototype.batchCall

// let count = 0

const getMethodCUCost = (method: string): number => {
  return RPC_CU_COSTS[method] ?? DEFAULT_CU_COST;
};

RpcClient.prototype.call = async function <T = any>(
  method: string,
  params?: any[],
  options?: CallOptions<T>,
): Promise<T> {
  const startTime = Date.now();
  const cuCost = getMethodCUCost(method);
  
  processingStats.rpcCalls++;
  processingStats.totalCUCost += cuCost;
  processingStats.rpcCallTypes.set(method, (processingStats.rpcCallTypes.get(method) ?? 0) + 1);
  processingStats.rpcCUCosts.set(method, (processingStats.rpcCUCosts.get(method) ?? 0) + cuCost);
  if (method === 'eth_call') {
    const callMethod = params?.[0]?.data.slice(0, 10) ?? '';
    const count = processingStats.ethCallCounts.get(callMethod) ?? 0;
    processingStats.ethCallCounts.set(callMethod, count + 1);
  }

  const response = await (this as any)._call(method, params, options);
  
  if (method === 'debug_traceBlockByHash') {
    fixSelfDestructs(response);
  }

  const duration = Date.now() - startTime;
  processingStats.rpcCallTime += duration;
  
  return response;
}

RpcClient.prototype.batchCall = async function <T = any>(batch: RpcCall[], options?: CallOptions<T>): Promise<T[]> {
  const startTime = Date.now();
  const batchCUCost = batch.reduce((total, call) => total + getMethodCUCost(call.method), 0);
  
  processingStats.rpcCalls += batch.length;
  processingStats.totalCUCost += batchCUCost;
  
  const response = await (this as any)._batchCall(batch, options);
  
  for (let i = 0; i < batch.length; i++) {
    if (batch[i].method === 'debug_traceBlockByHash') {
      fixSelfDestructs(response[i]);
    }
    const method = batch[i].method;
    const cuCost = getMethodCUCost(method);
    processingStats.rpcCallTypes.set(method, (processingStats.rpcCallTypes.get(method) ?? 0) + 1);
    processingStats.rpcCUCosts.set(method, (processingStats.rpcCUCosts.get(method) ?? 0) + cuCost);
    if (method === 'eth_call') {
      const callMethod = (batch[i].params?.[0] as any)?.data.slice(0, 10) ?? '';
      const count = processingStats.ethCallCounts.get(callMethod) ?? 0;
      processingStats.ethCallCounts.set(callMethod, count + 1);
    }
  }

  const duration = Date.now() - startTime;
  processingStats.rpcCallTime += duration;
  
  return response;
}

const fixSelfDestructs = (input: any) => {
  if (!input) return
  if (typeof input !== 'object') return
  if (Array.isArray(input)) {
    input.forEach((v) => fixSelfDestructs(v))
  }
  if ('calls' in input && Array.isArray(input.calls)) {
    input.calls.forEach((v: any) => fixSelfDestructs(v))
  }
  if ('type' in input && input.type === 'SELFDESTRUCT' && !input.to) {
    input.to = '0x0'
  }
  if ('result' in input) {
    fixSelfDestructs(input.result)
  }
}
