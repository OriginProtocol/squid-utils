import { type AbiFunction, type FunctionArguments } from '@subsquid/evm-abi';
import { EvmBatchProcessor } from '@subsquid/evm-processor';
import { Context } from './types';
export declare const multicall: <Function extends AbiFunction<any, any>>(ctx: Context<EvmBatchProcessor>, header: {
    height: number;
}, func: Function, address: string, calls: FunctionArguments<Function>[], throttle?: number) => Promise<ReturnType<Function["decodeResult"]>[]>;
