import { Context } from './types';
/**
 * Calculates the average block rate in seconds from the context blocks
 * Falls back to previous context if needed, defaults to 1 second if no data available
 */
export declare const calculateBlockRate: (ctx: Context) => Promise<number>;
