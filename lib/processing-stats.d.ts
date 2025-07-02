import { Context } from './types';
export declare const processingStats: {
    rpcCalls: number;
    rpcCallTime: number;
    rpcCallTypes: Map<string, number>;
    ethCallCounts: Map<string, number>;
    processingStartTime: number;
    lastResetTime: number;
    startBlockHeight: number | null;
    startBlockTime: number | null;
    currentBlockHeight: number | null;
    currentBlockTime: number | null;
};
export declare const printStats: (ctx: Context) => void;
export declare const resetStats: () => void;
