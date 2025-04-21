import { EvmBatchProcessor } from '@subsquid/evm-processor';
import { Context } from './types';
export declare const getNativeBalance: (ctx: Context<EvmBatchProcessor>, address: string, block: Context<EvmBatchProcessor>["blocks"]["0"]) => Promise<bigint>;
export declare const getNativeBalances: (ctx: Context<EvmBatchProcessor>, addresses: string[], block: Context<EvmBatchProcessor>["blocks"]["0"]) => Promise<bigint[]>;
