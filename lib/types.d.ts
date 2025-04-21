import { Chain } from 'viem';
import { DataHandlerContext, EvmBatchProcessor, EvmBatchProcessorFields } from '@subsquid/evm-processor';
import { Store } from '@subsquid/typeorm-store';
export type ProcessorTypes<T extends EvmBatchProcessor> = {
    Fields: EvmBatchProcessorFields<T>;
    Context: DataHandlerContext<Store, EvmBatchProcessorFields<T>> & {
        chain: Chain;
        blockRate: number;
        blocksWithContent: Block<T>[];
        lastBlockPerDay: Map<string, Block<T>>;
        latestBlockOfDay: (block: Block<T>) => boolean;
        frequencyBlocks: Block<T>[];
        __state: Map<string, unknown>;
    };
    Block: DataHandlerContext<Store, EvmBatchProcessorFields<T>>['blocks'][number];
    Log: DataHandlerContext<Store, EvmBatchProcessorFields<T>>['blocks'][number]['logs'][number];
    Transaction: DataHandlerContext<Store, EvmBatchProcessorFields<T>>['blocks'][number]['transactions'][number];
    Trace: DataHandlerContext<Store, EvmBatchProcessorFields<T>>['blocks'][number]['traces'][number];
};
export type Block<T extends EvmBatchProcessor = EvmBatchProcessor> = ProcessorTypes<T>['Block'];
export type Log<T extends EvmBatchProcessor = EvmBatchProcessor> = ProcessorTypes<T>['Log'];
export type Transaction<T extends EvmBatchProcessor = EvmBatchProcessor> = ProcessorTypes<T>['Transaction'];
export type Trace<T extends EvmBatchProcessor = EvmBatchProcessor> = ProcessorTypes<T>['Trace'];
export type Context<T extends EvmBatchProcessor = EvmBatchProcessor> = ProcessorTypes<T>['Context'];
export interface EvmProcessor<T extends EvmBatchProcessor = EvmBatchProcessor> {
    name: string;
    from?: number;
    chainId: number;
    initialize?: (ctx: Context<T>) => Promise<void>;
    setup?: (p: EvmBatchProcessor, chain: Chain) => void;
    process: (ctx: Context<T>) => Promise<void>;
}
