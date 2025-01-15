export declare const batchPromises: <T>(fns: (() => Promise<T>)[], concurrency?: number) => Promise<T[]>;
