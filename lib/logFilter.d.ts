import { Log } from './processor';
type LogFilterParams = {
    address?: string[];
    topic0?: string[];
    topic1?: string[];
    topic2?: string[];
    topic3?: string[];
    range?: {
        from: number;
        to?: number;
    };
    transaction?: boolean;
    transactionLogs?: boolean;
    transactionTraces?: boolean;
};
/**
 * Helper to create and match logs, ensuring hex values are lowercase and properly padded.
 */
export declare const logFilter: (filter: LogFilterParams) => {
    readonly value: LogFilterParams;
    readonly matches: (log: Log) => boolean;
};
export type LogFilter = ReturnType<typeof logFilter>;
export {};
