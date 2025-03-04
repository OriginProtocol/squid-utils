import { Context } from './types';
export declare const processingStats: {
    rpcCalls: number;
    rpcCallTime: number;
    rpcCallTypes: Map<string, number>;
};
export declare const printStats: (ctx: Context) => void;
