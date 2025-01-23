import { Context } from './types';
export declare const getNativeBalance: (ctx: Context, address: string, block: Context["blocks"]["0"]) => Promise<bigint>;
export declare const getNativeBalances: (ctx: Context, addresses: string[], block: Context["blocks"]["0"]) => Promise<bigint[]>;
