import { Context } from './types';
export declare const processingStats: {
    rpcCalls: number;
    rpcCallTime: number;
    rpcCallTypes: Map<string, number>;
    totalCUCost: number;
    rpcCUCosts: Map<string, number>;
    ethCallCounts: Map<string, number>;
};
export declare const printStats: (ctx: Context) => void;
