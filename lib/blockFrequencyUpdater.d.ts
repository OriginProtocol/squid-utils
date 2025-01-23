import { Block, Context } from './types';
export declare const blockFrequencyTracker: (params: {
    from: number;
}) => (ctx: Context, block: Block) => any;
export declare const blockFrequencyUpdater: (params: {
    from: number;
    parallelProcessing?: boolean;
}) => (ctx: Context, fn: (ctx: Context, block: Block) => Promise<void>) => Promise<void>;
export declare const isAerodromeImportantBlock: (ctx: Context, block: Block) => boolean;
