type InvertedMap<T extends Record<string, any>> = {
    [K in keyof T as T[K]]: K;
};
export declare const invertMap: <Map extends Record<K, V>, K extends string | number, V extends unknown>(map: Map) => InvertedMap<Map>;
export {};
