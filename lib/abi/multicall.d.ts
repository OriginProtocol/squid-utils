import * as p from '@subsquid/evm-codec';
import { ContractBase, type AbiFunction, type FunctionReturn, type FunctionArguments } from '@subsquid/evm-abi';
export type MulticallResult<T extends AbiFunction<any, any>> = {
    success: true;
    value: FunctionReturn<T>;
} | {
    success: false;
    returnData?: string;
    value?: undefined;
};
type AnyFunc = AbiFunction<any, any>;
type AggregateTuple<T extends AnyFunc = AnyFunc> = [func: T, address: string, args: T extends AnyFunc ? FunctionArguments<T> : never];
export declare class Multicall extends ContractBase {
    static aggregate: AbiFunction<{
        readonly calls: p.Codec<{
            readonly target: string;
            readonly callData: string | Uint8Array<ArrayBufferLike>;
        }[], {
            readonly target: string;
            readonly callData: string;
        }[]>;
    }, {
        readonly blockNumber: p.Codec<number | bigint, bigint>;
        readonly returnData: p.Codec<(string | Uint8Array<ArrayBufferLike>)[], string[]>;
    }>;
    static tryAggregate: AbiFunction<{
        readonly requireSuccess: p.Codec<boolean, boolean>;
        readonly calls: p.Codec<{
            readonly target: string;
            readonly callData: string | Uint8Array<ArrayBufferLike>;
        }[], {
            readonly target: string;
            readonly callData: string;
        }[]>;
    }, p.Codec<{
        readonly success: boolean;
        readonly returnData: string | Uint8Array<ArrayBufferLike>;
    }[], {
        readonly success: boolean;
        readonly returnData: string;
    }[]>>;
    aggregate<TF extends AnyFunc>(func: TF, address: string, calls: FunctionArguments<TF>[], paging?: number): Promise<FunctionReturn<TF>[]>;
    aggregate<TF extends AnyFunc>(func: TF, calls: (readonly [address: string, args: FunctionArguments<TF>])[], paging?: number): Promise<FunctionReturn<TF>[]>;
    aggregate(calls: AggregateTuple[], paging?: number): Promise<any[]>;
    tryAggregate<TF extends AnyFunc>(func: TF, address: string, calls: FunctionArguments<TF>[], paging?: number): Promise<MulticallResult<TF>[]>;
    tryAggregate<TF extends AnyFunc>(func: TF, calls: (readonly [address: string, args: FunctionArguments<TF>])[], paging?: number): Promise<MulticallResult<TF>[]>;
    tryAggregate(calls: AggregateTuple[], paging?: number): Promise<MulticallResult<any>[]>;
    private makeCalls;
}
export {};
