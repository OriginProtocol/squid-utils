"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sumBigIntBy = void 0;
const sumBigIntBy = (array, key) => {
    return array.reduce((acc, item) => acc + BigInt(item[key]), 0n);
};
exports.sumBigIntBy = sumBigIntBy;
//# sourceMappingURL=math.js.map