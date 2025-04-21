import { EvmBatchProcessor } from '@subsquid/evm-processor';
import { Block, Context } from './types';
export declare const blockFrequencyTracker: <T extends EvmBatchProcessor<{
    block: {
        timestamp: true;
    };
}>>(params: {
    from: number;
    minimumFrequency?: number;
}) => (ctx: Context<EvmBatchProcessor<{
    block: {
        timestamp: true;
    };
}>>, block: Block<EvmBatchProcessor<{
    block: {
        timestamp: true;
    };
}>>) => any;
export declare const blockFrequencyUpdater: (params: {
    from: number;
    parallelProcessing?: boolean;
    minimumFrequency?: number;
}) => (ctx: Context<EvmBatchProcessor>, fn: (ctx: Context<EvmBatchProcessor>, block: Block<EvmBatchProcessor>) => Promise<void>) => Promise<void>;
export declare const isAerodromeImportantBlock: (ctx: Context<EvmBatchProcessor>, block: Block<EvmBatchProcessor>) => boolean;
