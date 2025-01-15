"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAPR = exports.calculateAPY2 = exports.convertApyToApr = exports.calculateAPY = void 0;
const viem_1 = require("viem");
const calculateAPY = (from, to, fromAmount, toAmount) => {
    if (fromAmount === 0n || toAmount === 0n) {
        return { apr: 0, apy: 0 };
    }
    const diffTime = to.getTime() - from.getTime();
    const dayDiff = diffTime / (1000 * 60 * 60 * 24);
    const apr = (Number((0, viem_1.formatEther)(toAmount)) / Number((0, viem_1.formatEther)(fromAmount)) - 1) * (365.25 / dayDiff);
    const periods_per_year = 365.25 / Number(dayDiff);
    const apy = (1 + apr / periods_per_year) ** periods_per_year - 1;
    return {
        apr: apr || 0,
        apy: apy || 0,
    };
};
exports.calculateAPY = calculateAPY;
const convertApyToApr = (apy, compoundingPeriods = 365.25) => {
    return compoundingPeriods * (Math.pow(1 + apy, 1 / compoundingPeriods) - 1);
};
exports.convertApyToApr = convertApyToApr;
const calculateAPY2 = (fromAmount, toAmount) => {
    return +(0, viem_1.formatUnits)(((toAmount - fromAmount) * 10n ** 18n) / fromAmount, 18);
};
exports.calculateAPY2 = calculateAPY2;
const calculateAPR = (from, to, fromAmount, toAmount) => {
    if (fromAmount === 0n || toAmount === 0n) {
        return 0;
    }
    const diffTime = to.getTime() - from.getTime();
    const yearFraction = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    const growth = Number((0, viem_1.formatEther)(toAmount)) / Number((0, viem_1.formatEther)(fromAmount)) - 1;
    const apr = growth / yearFraction;
    return apr;
};
exports.calculateAPR = calculateAPR;
//# sourceMappingURL=calculateAPY.js.map