import { Chain } from 'viem';
import { KnownArchivesEVM } from '@subsquid/archive-registry';
import { DataHandlerContext, EvmBatchProcessor, EvmBatchProcessorFields } from '@subsquid/evm-processor';
import { Store } from '@subsquid/typeorm-store';
import './polyfills/rpc-issues';
export declare const createEvmBatchProcessor: (config: ChainConfig) => EvmBatchProcessor<{
    transaction: {
        from: true;
        to: true;
        hash: true;
        gasUsed: true;
        effectiveGasPrice: true;
        input: true;
        status: true;
    };
    log: {
        transactionHash: true;
        topics: true;
        data: true;
    };
    trace: {
        callFrom: true;
        callTo: true;
        callSighash: true;
        callValue: true;
        callInput: true;
        createResultAddress: true;
    };
}>;
export interface SquidProcessor {
    chainId?: 1 | 42161 | 8453;
    stateSchema?: string;
    processors: Processor[];
    postProcessors?: Processor[];
    validators?: Pick<Processor, 'process' | 'name'>[];
}
export interface Processor {
    name?: string;
    from?: number;
    initialize?: (ctx: Context) => Promise<void>;
    setup?: (p: ReturnType<typeof createEvmBatchProcessor>, chain?: Chain) => void;
    process: (ctx: Context) => Promise<void>;
}
export declare const defineSquidProcessor: (p: SquidProcessor) => SquidProcessor;
export declare const defineProcessor: (p: Processor) => Processor;
export interface ChainConfig {
    chain: Chain;
    archive: KnownArchivesEVM;
    endpoints: string[];
}
export declare const chainConfigs: {
    readonly 1: {
        readonly chain: {
            blockExplorers: {
                readonly default: {
                    readonly name: "Etherscan";
                    readonly url: "https://etherscan.io";
                    readonly apiUrl: "https://api.etherscan.io/api";
                };
            };
            contracts: {
                readonly ensRegistry: {
                    readonly address: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
                };
                readonly ensUniversalResolver: {
                    readonly address: "0xce01f8eee7E479C928F8919abD53E553a36CeF67";
                    readonly blockCreated: 19258213;
                };
                readonly multicall3: {
                    readonly address: "0xca11bde05977b3631167028862be2a173976ca11";
                    readonly blockCreated: 14353601;
                };
            };
            id: 1;
            name: "Ethereum";
            nativeCurrency: {
                readonly name: "Ether";
                readonly symbol: "ETH";
                readonly decimals: 18;
            };
            rpcUrls: {
                readonly default: {
                    readonly http: readonly ["https://cloudflare-eth.com"];
                };
            };
            sourceId?: number | undefined;
            testnet?: boolean | undefined;
            custom?: Record<string, unknown> | undefined;
            fees?: import("viem").ChainFees<undefined> | undefined;
            formatters?: undefined;
            serializers?: import("viem").ChainSerializers<undefined, import("viem").TransactionSerializable> | undefined;
        };
        readonly archive: "eth-mainnet";
        readonly endpoints: string[];
    };
    readonly 42161: {
        readonly chain: {
            blockExplorers: {
                readonly default: {
                    readonly name: "Arbiscan";
                    readonly url: "https://arbiscan.io";
                    readonly apiUrl: "https://api.arbiscan.io/api";
                };
            };
            contracts: {
                readonly multicall3: {
                    readonly address: "0xca11bde05977b3631167028862be2a173976ca11";
                    readonly blockCreated: 7654707;
                };
            };
            id: 42161;
            name: "Arbitrum One";
            nativeCurrency: {
                readonly name: "Ether";
                readonly symbol: "ETH";
                readonly decimals: 18;
            };
            rpcUrls: {
                readonly default: {
                    readonly http: readonly ["https://arb1.arbitrum.io/rpc"];
                };
            };
            sourceId?: number | undefined;
            testnet?: boolean | undefined;
            custom?: Record<string, unknown> | undefined;
            fees?: import("viem").ChainFees<undefined> | undefined;
            formatters?: undefined;
            serializers?: import("viem").ChainSerializers<undefined, import("viem").TransactionSerializable> | undefined;
        };
        readonly archive: "arbitrum";
        readonly endpoints: string[];
    };
    readonly 8453: {
        readonly chain: {
            blockExplorers: {
                readonly default: {
                    readonly name: "Basescan";
                    readonly url: "https://basescan.org";
                    readonly apiUrl: "https://api.basescan.org/api";
                };
            };
            contracts: {
                readonly disputeGameFactory: {
                    readonly 1: {
                        readonly address: "0x43edB88C4B80fDD2AdFF2412A7BebF9dF42cB40e";
                    };
                };
                readonly l2OutputOracle: {
                    readonly 1: {
                        readonly address: "0x56315b90c40730925ec5485cf004d835058518A0";
                    };
                };
                readonly multicall3: {
                    readonly address: "0xca11bde05977b3631167028862be2a173976ca11";
                    readonly blockCreated: 5022;
                };
                readonly portal: {
                    readonly 1: {
                        readonly address: "0x49048044D57e1C92A77f79988d21Fa8fAF74E97e";
                        readonly blockCreated: 17482143;
                    };
                };
                readonly l1StandardBridge: {
                    readonly 1: {
                        readonly address: "0x3154Cf16ccdb4C6d922629664174b904d80F2C35";
                        readonly blockCreated: 17482143;
                    };
                };
                readonly gasPriceOracle: {
                    readonly address: "0x420000000000000000000000000000000000000F";
                };
                readonly l1Block: {
                    readonly address: "0x4200000000000000000000000000000000000015";
                };
                readonly l2CrossDomainMessenger: {
                    readonly address: "0x4200000000000000000000000000000000000007";
                };
                readonly l2Erc721Bridge: {
                    readonly address: "0x4200000000000000000000000000000000000014";
                };
                readonly l2StandardBridge: {
                    readonly address: "0x4200000000000000000000000000000000000010";
                };
                readonly l2ToL1MessagePasser: {
                    readonly address: "0x4200000000000000000000000000000000000016";
                };
            };
            id: 8453;
            name: "Base";
            nativeCurrency: {
                readonly name: "Ether";
                readonly symbol: "ETH";
                readonly decimals: 18;
            };
            rpcUrls: {
                readonly default: {
                    readonly http: readonly ["https://mainnet.base.org"];
                };
            };
            sourceId: 1;
            testnet?: boolean | undefined;
            custom?: Record<string, unknown> | undefined;
            fees?: import("viem").ChainFees<undefined> | undefined;
            formatters: {
                readonly block: {
                    exclude: [] | undefined;
                    format: (args: import("viem/chains").OpStackRpcBlock) => {
                        baseFeePerGas: bigint | null;
                        blobGasUsed: bigint;
                        difficulty: bigint;
                        excessBlobGas: bigint;
                        extraData: import("viem").Hex;
                        gasLimit: bigint;
                        gasUsed: bigint;
                        hash: `0x${string}` | null;
                        logsBloom: `0x${string}` | null;
                        miner: import("viem").Address;
                        mixHash: import("viem").Hash;
                        nonce: `0x${string}` | null;
                        number: bigint | null;
                        parentBeaconBlockRoot?: import("viem").Hex | undefined;
                        parentHash: import("viem").Hash;
                        receiptsRoot: import("viem").Hex;
                        sealFields: import("viem").Hex[];
                        sha3Uncles: import("viem").Hash;
                        size: bigint;
                        stateRoot: import("viem").Hash;
                        timestamp: bigint;
                        totalDifficulty: bigint | null;
                        transactions: `0x${string}`[] | import("viem/chains").OpStackTransaction<boolean>[];
                        transactionsRoot: import("viem").Hash;
                        uncles: import("viem").Hash[];
                        withdrawals?: import("viem").Withdrawal[] | undefined;
                        withdrawalsRoot?: import("viem").Hex | undefined;
                    } & {};
                    type: "block";
                };
                readonly transaction: {
                    exclude: [] | undefined;
                    format: (args: import("viem/chains").OpStackRpcTransaction) => ({
                        blockHash: `0x${string}` | null;
                        blockNumber: bigint | null;
                        from: import("viem").Address;
                        gas: bigint;
                        hash: import("viem").Hash;
                        input: import("viem").Hex;
                        nonce: number;
                        r: import("viem").Hex;
                        s: import("viem").Hex;
                        to: import("viem").Address | null;
                        transactionIndex: number | null;
                        typeHex: import("viem").Hex | null;
                        v: bigint;
                        value: bigint;
                        yParity: number;
                        gasPrice?: undefined;
                        maxFeePerBlobGas?: undefined;
                        maxFeePerGas: bigint;
                        maxPriorityFeePerGas: bigint;
                        isSystemTx?: boolean;
                        mint?: bigint | undefined;
                        sourceHash: import("viem").Hex;
                        type: "deposit";
                    } | {
                        r: import("viem").Hex;
                        s: import("viem").Hex;
                        v: bigint;
                        to: import("viem").Address | null;
                        from: import("viem").Address;
                        gas: bigint;
                        nonce: number;
                        value: bigint;
                        blockHash: `0x${string}` | null;
                        blockNumber: bigint | null;
                        hash: import("viem").Hash;
                        input: import("viem").Hex;
                        transactionIndex: number | null;
                        typeHex: import("viem").Hex | null;
                        accessList?: undefined;
                        authorizationList?: undefined;
                        blobVersionedHashes?: undefined;
                        chainId?: number | undefined;
                        yParity?: undefined;
                        type: "legacy";
                        gasPrice: bigint;
                        maxFeePerBlobGas?: undefined;
                        maxFeePerGas?: undefined;
                        maxPriorityFeePerGas?: undefined;
                        isSystemTx?: undefined;
                        mint?: undefined;
                        sourceHash?: undefined;
                    } | {
                        blockHash: `0x${string}` | null;
                        blockNumber: bigint | null;
                        from: import("viem").Address;
                        gas: bigint;
                        hash: import("viem").Hash;
                        input: import("viem").Hex;
                        nonce: number;
                        r: import("viem").Hex;
                        s: import("viem").Hex;
                        to: import("viem").Address | null;
                        transactionIndex: number | null;
                        typeHex: import("viem").Hex | null;
                        v: bigint;
                        value: bigint;
                        yParity: number;
                        accessList: import("viem").AccessList;
                        authorizationList?: undefined;
                        blobVersionedHashes?: undefined;
                        chainId: number;
                        type: "eip2930";
                        gasPrice: bigint;
                        maxFeePerBlobGas?: undefined;
                        maxFeePerGas?: undefined;
                        maxPriorityFeePerGas?: undefined;
                        isSystemTx?: undefined;
                        mint?: undefined;
                        sourceHash?: undefined;
                    } | {
                        blockHash: `0x${string}` | null;
                        blockNumber: bigint | null;
                        from: import("viem").Address;
                        gas: bigint;
                        hash: import("viem").Hash;
                        input: import("viem").Hex;
                        nonce: number;
                        r: import("viem").Hex;
                        s: import("viem").Hex;
                        to: import("viem").Address | null;
                        transactionIndex: number | null;
                        typeHex: import("viem").Hex | null;
                        v: bigint;
                        value: bigint;
                        yParity: number;
                        accessList: import("viem").AccessList;
                        authorizationList?: undefined;
                        blobVersionedHashes?: undefined;
                        chainId: number;
                        type: "eip1559";
                        gasPrice?: undefined;
                        maxFeePerBlobGas?: undefined;
                        maxFeePerGas: bigint;
                        maxPriorityFeePerGas: bigint;
                        isSystemTx?: undefined;
                        mint?: undefined;
                        sourceHash?: undefined;
                    } | {
                        blockHash: `0x${string}` | null;
                        blockNumber: bigint | null;
                        from: import("viem").Address;
                        gas: bigint;
                        hash: import("viem").Hash;
                        input: import("viem").Hex;
                        nonce: number;
                        r: import("viem").Hex;
                        s: import("viem").Hex;
                        to: import("viem").Address | null;
                        transactionIndex: number | null;
                        typeHex: import("viem").Hex | null;
                        v: bigint;
                        value: bigint;
                        yParity: number;
                        accessList: import("viem").AccessList;
                        authorizationList?: undefined;
                        blobVersionedHashes: readonly import("viem").Hex[];
                        chainId: number;
                        type: "eip4844";
                        gasPrice?: undefined;
                        maxFeePerBlobGas: bigint;
                        maxFeePerGas: bigint;
                        maxPriorityFeePerGas: bigint;
                        isSystemTx?: undefined;
                        mint?: undefined;
                        sourceHash?: undefined;
                    } | {
                        blockHash: `0x${string}` | null;
                        blockNumber: bigint | null;
                        from: import("viem").Address;
                        gas: bigint;
                        hash: import("viem").Hash;
                        input: import("viem").Hex;
                        nonce: number;
                        r: import("viem").Hex;
                        s: import("viem").Hex;
                        to: import("viem").Address | null;
                        transactionIndex: number | null;
                        typeHex: import("viem").Hex | null;
                        v: bigint;
                        value: bigint;
                        yParity: number;
                        accessList: import("viem").AccessList;
                        authorizationList: import("viem/experimental").SignedAuthorizationList;
                        blobVersionedHashes?: undefined;
                        chainId: number;
                        type: "eip7702";
                        gasPrice?: undefined;
                        maxFeePerBlobGas?: undefined;
                        maxFeePerGas: bigint;
                        maxPriorityFeePerGas: bigint;
                        isSystemTx?: undefined;
                        mint?: undefined;
                        sourceHash?: undefined;
                    }) & {};
                    type: "transaction";
                };
                readonly transactionReceipt: {
                    exclude: [] | undefined;
                    format: (args: import("viem/chains").OpStackRpcTransactionReceipt) => {
                        blobGasPrice?: bigint | undefined;
                        blobGasUsed?: bigint | undefined;
                        blockHash: import("viem").Hash;
                        blockNumber: bigint;
                        contractAddress: import("viem").Address | null | undefined;
                        cumulativeGasUsed: bigint;
                        effectiveGasPrice: bigint;
                        from: import("viem").Address;
                        gasUsed: bigint;
                        logs: import("viem").Log<bigint, number, false>[];
                        logsBloom: import("viem").Hex;
                        root?: import("viem").Hash | undefined;
                        status: "success" | "reverted";
                        to: import("viem").Address | null;
                        transactionHash: import("viem").Hash;
                        transactionIndex: number;
                        type: import("viem").TransactionType;
                        l1GasPrice: bigint | null;
                        l1GasUsed: bigint | null;
                        l1Fee: bigint | null;
                        l1FeeScalar: number | null;
                    } & {};
                    type: "transactionReceipt";
                };
            };
            serializers: {
                readonly transaction: typeof import("viem/chains").serializeTransactionOpStack;
            };
        };
        readonly archive: "base-mainnet";
        readonly endpoints: string[];
    };
};
export declare const run: ({ chainId, stateSchema, processors, postProcessors, validators }: SquidProcessor) => void;
export type Fields = EvmBatchProcessorFields<ReturnType<typeof createEvmBatchProcessor>>;
export type Context = DataHandlerContext<Store, Fields> & {
    chain: Chain;
    blockRate: number;
    blocksWithContent: Block[];
    frequencyBlocks: Block[];
    __state: Map<string, unknown>;
};
export type Block = Context['blocks']['0'];
export type Log = Context['blocks']['0']['logs']['0'];
export type Transaction = Context['blocks']['0']['transactions']['0'];
export type Trace = Context['blocks']['0']['traces']['0'];
