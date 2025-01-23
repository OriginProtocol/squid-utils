import { Trace } from './types';
type TraceType = 'call' | 'create' | 'suicide' | 'reward';
type TraceFilterParams = {
    type: TraceType[];
    callFrom?: string[];
    callTo?: string[];
    callSighash?: string[];
    suicideRefundAddress?: string[];
    transaction?: boolean;
    transactionLogs?: boolean;
    range?: {
        from: number;
        to?: number;
    };
    error?: boolean;
};
/**
 * Helper to create and match traces.
 */
export declare const traceFilter: (filter: TraceFilterParams) => {
    readonly value: TraceFilterParams;
    readonly matches: (trace: Trace) => boolean;
};
export type TraceFilter = ReturnType<typeof traceFilter>;
export {};
