"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchPromises = void 0;
const batchPromises = async (fns, concurrency = 10) => {
    const results = [];
    while (fns.length) {
        results.push(...(await Promise.all(fns.splice(0, concurrency).map((f) => f()))));
    }
    return results;
};
exports.batchPromises = batchPromises;
//# sourceMappingURL=batchPromises.js.map