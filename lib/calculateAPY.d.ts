export declare const calculateAPY: (from: Date, to: Date, fromAmount: bigint, toAmount: bigint) => {
    apr: number;
    apy: number;
};
export declare const convertApyToApr: (apy: number, compoundingPeriods?: number) => number;
export declare const calculateAPY2: (fromAmount: bigint, toAmount: bigint) => number;
export declare const calculateAPR: (from: Date, to: Date, fromAmount: bigint, toAmount: bigint) => number;
