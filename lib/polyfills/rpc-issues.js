"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Fix RPC issues
// import * as fs from 'node:fs'
const rpc_client_1 = require("@subsquid/rpc-client");
const rpc_cu_costs_1 = require("../constants/rpc-cu-costs");
const processing_stats_1 = require("../processing-stats");
rpc_client_1.RpcClient.prototype._call = rpc_client_1.RpcClient.prototype.call;
rpc_client_1.RpcClient.prototype._batchCall = rpc_client_1.RpcClient.prototype.batchCall;
// let count = 0
const getMethodCUCost = (method) => {
    return rpc_cu_costs_1.RPC_CU_COSTS[method] ?? rpc_cu_costs_1.DEFAULT_CU_COST;
};
/**
 * The portal's `/stream` hands us a block a few hundred ms before the RPC node
 * has it, so a contract read at the head block can come back "block not found".
 * The gateway path never saw this, because RPC head-polling *was* the ingestion
 * source — a block could not arrive ahead of the node it came from.
 *
 * Retry briefly, then give up: the gap is sub-second, so a block still missing
 * after this window is a real problem (a reorg, or a node genuinely behind) and
 * must surface rather than be papered over.
 */
const BLOCK_NOT_FOUND_RETRIES = 10;
const BLOCK_NOT_FOUND_RETRY_MS = 150;
const isBlockNotFound = (err) => err != null &&
    (err.code === -32001 || err.code === -32000) &&
    typeof err.message === 'string' &&
    /block not found|header not found|unknown block|missing trie node/i.test(err.message);
const callWithHeadRetry = async function (method, params, options) {
    for (let attempt = 0;; attempt++) {
        try {
            return await this._call(method, params, options);
        }
        catch (err) {
            if (attempt >= BLOCK_NOT_FOUND_RETRIES || !isBlockNotFound(err))
                throw err;
            await new Promise((resolve) => setTimeout(resolve, BLOCK_NOT_FOUND_RETRY_MS));
        }
    }
};
rpc_client_1.RpcClient.prototype.call = async function (method, params, options) {
    const startTime = Date.now();
    const cuCost = getMethodCUCost(method);
    processing_stats_1.processingStats.rpcCalls++;
    processing_stats_1.processingStats.rpcCallTypes.set(method, (processing_stats_1.processingStats.rpcCallTypes.get(method) ?? 0) + 1);
    if (method === 'eth_call') {
        const callMethod = params?.[0]?.data.slice(0, 10) ?? '';
        const count = processing_stats_1.processingStats.ethCallCounts.get(callMethod) ?? 0;
        processing_stats_1.processingStats.ethCallCounts.set(callMethod, count + 1);
    }
    const response = await callWithHeadRetry.call(this, method, params, options);
    if (method === 'debug_traceBlockByHash') {
        fixSelfDestructs(response);
    }
    const duration = Date.now() - startTime;
    processing_stats_1.processingStats.rpcCallTime += duration;
    return response;
};
rpc_client_1.RpcClient.prototype.batchCall = async function (batch, options) {
    const startTime = Date.now();
    const batchCUCost = batch.reduce((total, call) => total + getMethodCUCost(call.method), 0);
    processing_stats_1.processingStats.rpcCalls += batch.length;
    // Same head race as `call` — multicall reads at the head block hit it too.
    let response;
    for (let attempt = 0;; attempt++) {
        try {
            response = await this._batchCall(batch, options);
            break;
        }
        catch (err) {
            if (attempt >= BLOCK_NOT_FOUND_RETRIES || !isBlockNotFound(err))
                throw err;
            await new Promise((resolve) => setTimeout(resolve, BLOCK_NOT_FOUND_RETRY_MS));
        }
    }
    for (let i = 0; i < batch.length; i++) {
        if (batch[i].method === 'debug_traceBlockByHash') {
            fixSelfDestructs(response[i]);
        }
        const method = batch[i].method;
        const cuCost = getMethodCUCost(method);
        processing_stats_1.processingStats.rpcCallTypes.set(method, (processing_stats_1.processingStats.rpcCallTypes.get(method) ?? 0) + 1);
        if (method === 'eth_call') {
            const callMethod = batch[i].params?.[0]?.data.slice(0, 10) ?? '';
            const count = processing_stats_1.processingStats.ethCallCounts.get(callMethod) ?? 0;
            processing_stats_1.processingStats.ethCallCounts.set(callMethod, count + 1);
        }
    }
    const duration = Date.now() - startTime;
    processing_stats_1.processingStats.rpcCallTime += duration;
    return response;
};
const fixSelfDestructs = (input) => {
    if (!input)
        return;
    if (typeof input !== 'object')
        return;
    if (Array.isArray(input)) {
        input.forEach((v) => fixSelfDestructs(v));
    }
    if ('calls' in input && Array.isArray(input.calls)) {
        input.calls.forEach((v) => fixSelfDestructs(v));
    }
    if ('type' in input && input.type === 'SELFDESTRUCT' && !input.to) {
        input.to = '0x0';
    }
    if ('result' in input) {
        fixSelfDestructs(input.result);
    }
};
//# sourceMappingURL=rpc-issues.js.map