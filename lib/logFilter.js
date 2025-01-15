"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logFilter = void 0;
const viem_1 = require("viem");
const pad = (hex) => (0, viem_1.pad)(hex);
const lower = (hex) => hex.toLowerCase();
const prepare = (hex) => pad(lower(hex));
/**
 * Helper to create and match logs, ensuring hex values are lowercase and properly padded.
 */
const logFilter = (filter) => {
    filter = {
        address: filter.address?.map(lower),
        topic0: filter.topic0?.map(prepare),
        topic1: filter.topic1?.map(prepare),
        topic2: filter.topic2?.map(prepare),
        topic3: filter.topic3?.map(prepare),
        range: filter.range,
        transaction: filter.transaction,
        transactionLogs: filter.transactionLogs,
        transactionTraces: filter.transactionTraces,
    };
    return {
        value: filter,
        matches(log) {
            if (filter.address && !filter.address.includes(log.address)) {
                return false;
            }
            if (filter.topic0 && !filter.topic0.includes(log.topics[0])) {
                return false;
            }
            if (filter.topic1 && !filter.topic1.includes(log.topics[1])) {
                return false;
            }
            if (filter.topic2 && !filter.topic2.includes(log.topics[2])) {
                return false;
            }
            if (filter.topic3 && !filter.topic3.includes(log.topics[3])) {
                return false;
            }
            if (filter.range &&
                (log.block.height < filter.range.from || (filter.range.to && log.block.height > filter.range.to))) {
                return false;
            }
            return true;
        },
    };
};
exports.logFilter = logFilter;
//# sourceMappingURL=logFilter.js.map