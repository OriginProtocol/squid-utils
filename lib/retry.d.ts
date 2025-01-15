export declare const retry: <T>(fn: () => Promise<T>, retries: number) => Promise<T | undefined>;
