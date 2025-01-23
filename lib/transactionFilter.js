"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionFilter = void 0;
const viem_1 = require("viem");
const pad = (hex) => (0, viem_1.pad)(hex);
const lower = (hex) => hex.toLowerCase();
const prepare = (hex) => pad(lower(hex));
/**
 * Helper to create and match logs, ensuring hex values are lowercase and properly padded.
 */
const transactionFilter = (filter) => {
    filter = {
        from: filter.from?.map(lower),
        to: filter.to?.map(lower),
        sighash: filter.sighash?.map(lower),
        logs: filter.logs,
        traces: filter.traces,
        stateDiffs: filter.stateDiffs,
        range: filter.range,
    };
    return {
        value: filter,
        matches(transaction) {
            if (filter.from && !filter.from.includes(transaction.from)) {
                return false;
            }
            if (filter.to && (!transaction.to || !filter.to.includes(transaction.to))) {
                return false;
            }
            if (filter.sighash && !filter.sighash.includes(transaction.sighash)) {
                return false;
            }
            if (filter.range &&
                (transaction.block.height < filter.range.from ||
                    (filter.range.to && transaction.block.height > filter.range.to))) {
                return false;
            }
            return true;
        },
    };
};
exports.transactionFilter = transactionFilter;
//# sourceMappingURL=transactionFilter.js.map