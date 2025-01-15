"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForProcessorState = exports.publishProcessorState = exports.useProcessorState = exports.cached = void 0;
const cached = (keyFn, fn) => {
    return async (...params) => {
        const [state, setState] = (0, exports.useProcessorState)(params[0], keyFn(...params), undefined);
        if (state)
            return state;
        const result = await fn(...params);
        setState(result);
        return result;
    };
};
exports.cached = cached;
const useProcessorState = (ctx, key, defaultValue) => {
    const { __state } = ctx;
    let value = __state.get(key);
    if (!value) {
        value = defaultValue;
        __state.set(key, value);
    }
    return [
        value,
        (value) => {
            __state.set(key, value);
        },
    ];
};
exports.useProcessorState = useProcessorState;
/**
 * Not for continuously updating state within a single context.
 * Use this to distribute state throughout processors one time.
 * *Not for gradual/continuous update within the context.*
 */
const publishProcessorState = (ctx, key, state) => {
    const [, setState] = (0, exports.useProcessorState)(ctx, `waitForProcessorState:${key}`);
    const [listeners] = (0, exports.useProcessorState)(ctx, `waitForProcessorState-listeners:${key}`, []);
    setState(state);
    listeners.forEach((listener) => listener(state));
};
exports.publishProcessorState = publishProcessorState;
/**
 * Wait for processor state to be set and retrieve it.
 */
const waitForProcessorState = (ctx, key) => {
    return new Promise((resolve) => {
        const [state] = (0, exports.useProcessorState)(ctx, `waitForProcessorState:${key}`);
        if (state)
            resolve(state);
        const [listeners] = (0, exports.useProcessorState)(ctx, `waitForProcessorState-listeners:${key}`, []);
        listeners.push(resolve);
    });
};
exports.waitForProcessorState = waitForProcessorState;
//# sourceMappingURL=state.js.map