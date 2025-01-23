import { Chain } from 'viem';
import { EvmBatchProcessor, FieldSelection } from '@subsquid/evm-processor';
import './polyfills/rpc-issues';
import { Context } from './types';
export declare const createEvmBatchProcessor: (config: ChainConfig, options?: {
    fields: FieldSelection;
}) => EvmBatchProcessor<{
    transaction: {
        hash: boolean;
        nonce?: boolean | undefined;
        gasUsed: boolean;
        sighash: boolean;
        from: boolean;
        to: boolean;
        gas: boolean;
        gasPrice?: boolean | undefined;
        maxFeePerGas?: boolean | undefined;
        maxPriorityFeePerGas?: boolean | undefined;
        input: boolean;
        value: boolean;
        v?: boolean | undefined;
        r?: boolean | undefined;
        s?: boolean | undefined;
        yParity?: boolean | undefined;
        chainId?: boolean | undefined;
        authorizationList?: boolean | undefined;
        cumulativeGasUsed?: boolean | undefined;
        effectiveGasPrice?: boolean | undefined;
        contractAddress?: boolean | undefined;
        type?: boolean | undefined;
        status: boolean;
        l1Fee?: boolean | undefined;
        l1FeeScalar?: boolean | undefined;
        l1GasPrice?: boolean | undefined;
        l1GasUsed?: boolean | undefined;
        l1BlobBaseFee?: boolean | undefined;
        l1BlobBaseFeeScalar?: boolean | undefined;
        l1BaseFeeScalar?: boolean | undefined;
    };
    log: {
        transactionHash: boolean;
        address?: boolean | undefined;
        data: boolean;
        topics: boolean;
    };
    trace: {
        subtraces?: boolean | undefined;
        error?: boolean | undefined;
        revertReason?: boolean | undefined;
        createFrom?: boolean | undefined;
        createGas?: boolean | undefined;
        createValue?: boolean | undefined;
        createInit?: boolean | undefined;
        createResultGasUsed?: boolean | undefined;
        createResultAddress: boolean;
        createResultCode?: boolean | undefined;
        callFrom: boolean;
        callGas?: boolean | undefined;
        callValue: boolean;
        callSighash: boolean;
        callTo: boolean;
        callInput: boolean;
        callCallType?: boolean | undefined;
        callResultGasUsed?: boolean | undefined;
        callResultOutput?: boolean | undefined;
        suicideAddress: boolean;
        suicideRefundAddress: boolean;
        suicideBalance: boolean;
        rewardValue?: boolean | undefined;
        rewardType?: boolean | undefined;
        rewardAuthor?: boolean | undefined;
    };
    block?: {
        nonce?: boolean | undefined;
        sha3Uncles?: boolean | undefined;
        logsBloom?: boolean | undefined;
        transactionsRoot?: boolean | undefined;
        stateRoot?: boolean | undefined;
        receiptsRoot?: boolean | undefined;
        mixHash?: boolean | undefined;
        miner?: boolean | undefined;
        difficulty?: boolean | undefined;
        totalDifficulty?: boolean | undefined;
        extraData?: boolean | undefined;
        size?: boolean | undefined;
        gasLimit?: boolean | undefined;
        gasUsed?: boolean | undefined;
        timestamp?: boolean | undefined;
        baseFeePerGas?: boolean | undefined;
        l1BlockNumber?: boolean | undefined;
    };
    stateDiff?: {
        kind?: boolean | undefined;
        prev?: boolean | undefined;
        next?: boolean | undefined;
    };
}>;
export interface SquidProcessor {
    fromNow?: boolean;
    chainId?: keyof typeof chainConfigs;
    stateSchema: string;
    processors: Processor[];
    postProcessors?: Processor[];
    validators?: Pick<Processor, 'process' | 'name'>[];
    postValidation?: (ctx: Context) => Promise<void>;
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
    gateway: string;
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
        readonly gateway: "https://v2.archive.subsquid.io/network/ethereum-mainnet";
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
        readonly gateway: "https://v2.archive.subsquid.io/network/arbitrum-one";
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
        readonly gateway: "https://v2.archive.subsquid.io/network/base-mainnet";
        readonly endpoints: string[];
    };
    readonly 146: {
        readonly chain: {
            blockExplorers: {
                readonly default: {
                    readonly name: "Sonic Explorer";
                    readonly url: "https://sonicscan.org/";
                };
            };
            contracts: {
                readonly multicall3: {
                    readonly address: "0xca11bde05977b3631167028862be2a173976ca11";
                    readonly blockCreated: 60;
                };
            };
            id: 146;
            name: "Sonic";
            nativeCurrency: {
                readonly decimals: 18;
                readonly name: "Sonic";
                readonly symbol: "S";
            };
            rpcUrls: {
                readonly default: {
                    readonly http: readonly ["https://rpc.soniclabs.com"];
                };
            };
            sourceId?: number | undefined;
            testnet: false;
            custom?: Record<string, unknown> | undefined;
            fees?: import("viem").ChainFees<undefined> | undefined;
            formatters?: undefined;
            serializers?: import("viem").ChainSerializers<undefined, import("viem").TransactionSerializable> | undefined;
        };
        readonly gateway: "https://v2.archive.subsquid.io/network/sonic-mainnet";
        readonly endpoints: string[];
    };
};
export declare const run: ({ fromNow, chainId, stateSchema, processors, postProcessors, validators, postValidation }: SquidProcessor) => Promise<void>;
