export const RPC_CU_COSTS: Record<string, number> = {
  debug_traceTransaction: 300,
  debug_traceCall: 300,
  debug_traceBlockByHash: 300,
  debug_traceBlockByNumber: 300,
  trace_get: 75,
  trace_block: 75,
  trace_transaction: 75,
  trace_call: 75,
  trace_rawTransaction: 75,
  trace_filter: 75,
  trace_replayTransaction: 3000,
  trace_replayBlockTransactions: 3000,
  net_version: 0,
  eth_chainId: 0,
  eth_syncing: 0,
  eth_protocolVersion: 0,
  net_listening: 0,
  eth_uninstallFilter: 10,
  eth_accounts: 10,
  eth_blockNumber: 10,
  eth_subscribe: 10,
  eth_unsubscribe: 10,
  eth_feeHistory: 10,
  eth_maxPriorityFeePerGas: 10,
  eth_createAccessList: 10,
  eth_getTransactionReceipt: 15,
  eth_getUncleByBlockHashAndIndex: 15,
  eth_getUncleByBlockNumberAndIndex: 15,
  eth_getTransactionByBlockHashAndIndex: 15,
  eth_getTransactionByBlockNumberAndIndex: 15,
  eth_getUncleCountByBlockHash: 15,
  eth_getUncleCountByBlockNumber: 15,
  web3_clientVersion: 15,
  web3_sha3: 15,
  eth_getBlockByNumber: 15,
  eth_getStorageAt: 15,
  eth_getTransactionByHash: 15,
  eth_gasPrice: 20,
  eth_getBalance: 20,
  eth_getCode: 20,
  eth_getFilterChanges: 20,
  eth_newBlockFilter: 20,
  eth_newFilter: 20,
  eth_getBlockTransactionCountByHash: 20,
  eth_getBlockTransactionCountByNumber: 20,
  eth_getProof: 20,
  eth_getBlockByHash: 20,
  eth_getTransactionCount: 20,
  eth_call: 75,
  eth_getFilterLogs: 75,
  eth_getLogs: 75,
  eth_estimateGas: 75,
  eth_sendRawTransaction: 200,
  eth_getBlockReceipts: 200,
};

export const DEFAULT_CU_COST = 20; 