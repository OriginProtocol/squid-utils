import { EvmBatchProcessor } from '@subsquid/evm-processor';
import { Context } from './types';
export declare const cached: <I extends [Context<EvmBatchProcessor>, ...any[]], R>(keyFn: (...params: I) => string, fn: (...params: I) => Promise<R>) => (...params: I) => Promise<R>;
export declare const useProcessorState: <T>(ctx: Context<EvmBatchProcessor>, key: string, defaultValue?: T) => readonly [T, (value: T) => void];
/**
 * Not for continuously updating state within a single context.
 * Use this to distribute state throughout processors one time.
 * *Not for gradual/continuous update within the context.*
 */
export declare const publishProcessorState: <T>(ctx: Context<EvmBatchProcessor>, key: string, state: T) => void;
/**
 * Wait for processor state to be set and retrieve it.
 */
export declare const waitForProcessorState: <T>(ctx: Context<EvmBatchProcessor>, key: string) => Promise<T>;
