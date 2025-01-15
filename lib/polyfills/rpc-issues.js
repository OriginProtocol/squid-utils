"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Fix RPC issues
// import * as fs from 'node:fs'
const rpc_client_1 = require("@subsquid/rpc-client");
const processing_stats_1 = require("../processing-stats");
rpc_client_1.RpcClient.prototype._call = rpc_client_1.RpcClient.prototype.call;
rpc_client_1.RpcClient.prototype._batchCall = rpc_client_1.RpcClient.prototype.batchCall;
// let count = 0
rpc_client_1.RpcClient.prototype.call = async function (method, params, options) {
    const time = Date.now();
    processing_stats_1.processingStats.rpcCalls++;
    const response = await this._call(method, params, options);
    if (method === 'debug_traceBlockByHash') {
        fixSelfDestructs(response);
    }
    // fs.writeFileSync(`rpcResponse${count}-in.json`, JSON.stringify({ method, params, options }, null, 2))
    // fs.writeFileSync(`rpcResponse${count++}.json`, JSON.stringify(response, null, 2))
    processing_stats_1.processingStats.rpcCallTime += Date.now() - time;
    return response;
};
rpc_client_1.RpcClient.prototype.batchCall = async function (batch, options) {
    const time = Date.now();
    processing_stats_1.processingStats.rpcCalls += batch.length;
    const response = await this._batchCall(batch, options);
    for (let i = 0; i < batch.length; i++) {
        if (batch[i].method === 'debug_traceBlockByHash') {
            fixSelfDestructs(response[i]);
        }
    }
    // fs.writeFileSync(`rpcResponse$${count}-in.json`, JSON.stringify({ batch, options }, null, 2))
    // fs.writeFileSync(`rpcResponse$${count++}.json`, JSON.stringify(response, null, 2))
    processing_stats_1.processingStats.rpcCallTime += Date.now() - time;
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