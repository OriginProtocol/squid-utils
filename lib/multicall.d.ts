import { type AbiFunction, type FunctionArguments } from '@subsquid/evm-abi';
import { Context } from './processor';
export declare const multicall: <Function extends AbiFunction<any, any>>(ctx: Context, header: {
    height: number;
}, func: Function, address: string, calls: FunctionArguments<Function>[], throttle?: number) => Promise<ReturnType<Function["decodeResult"]>[]>;
