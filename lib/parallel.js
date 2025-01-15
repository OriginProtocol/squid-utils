"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parallel = void 0;
const parallel = async (fns, concurrency) => {
    const results = [];
    let promises = [];
    for (const fn of fns) {
        promises.push(fn());
        if (promises.length >= concurrency) {
            const result = await Promise.race(promises);
            results.push(result);
            promises = promises.filter((p) => p !== result);
        }
    }
    results.push(...(await Promise.all(promises)));
    return results;
};
exports.parallel = parallel;
//# sourceMappingURL=parallel.js.map