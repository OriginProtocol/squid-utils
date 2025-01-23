import { Transaction } from './types';
export interface TransactionFilter {
    from?: string[];
    to?: string[];
    sighash?: string[];
    logs?: boolean;
    traces?: boolean;
    stateDiffs?: boolean;
    range?: {
        from: number;
        to?: number;
    };
}
/**
 * Helper to create and match logs, ensuring hex values are lowercase and properly padded.
 */
export declare const transactionFilter: (filter: TransactionFilter) => {
    readonly value: TransactionFilter;
    readonly matches: (transaction: Transaction) => boolean;
};
