export declare const parallel: <T>(fns: (() => Promise<T>)[], concurrency: number) => Promise<T[]>;
