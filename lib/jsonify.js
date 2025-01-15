"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonify = void 0;
function replacer(key, value) {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    else {
        return value;
    }
}
const jsonify = (value, customReplacer) => JSON.stringify(value, (key, value) => replacer(key, customReplacer?.(key, value) ?? value));
exports.jsonify = jsonify;
//# sourceMappingURL=jsonify.js.map