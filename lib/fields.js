"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeFieldSelection = exports.PORTAL_DEFAULT_FIELDS = exports.IMPLICIT_FIELDS = exports.DEFAULT_FIELDS = void 0;
/**
 * Fields squid-utils asks for on top of whatever the SDK supplies by default.
 * Used by the gateway-era `createEvmBatchProcessor` path.
 */
exports.DEFAULT_FIELDS = {
    transaction: {
        from: true,
        to: true,
        hash: true,
        gasUsed: true,
        gas: true,
        value: true,
        sighash: true,
        input: true,
        status: true,
        effectiveGasPrice: true,
    },
    log: {
        transactionHash: true,
        topics: true,
        data: true,
    },
    trace: {
        callFrom: true,
        callTo: true,
        callSighash: true,
        callValue: true,
        callInput: true,
        createResultAddress: true,
        suicideRefundAddress: true,
        suicideAddress: true,
        suicideBalance: true,
        error: true,
        revertReason: true,
    },
};
/**
 * Fields the gateway-era SDK merged into every selection implicitly
 * (its own `DEFAULT_FIELDS`). The Portal SDK has no implicit merge, so the
 * portal path has to spell them out or lose them — silently for `log.address`,
 * at compile time for `block.timestamp`.
 */
exports.IMPLICIT_FIELDS = {
    block: { timestamp: true },
    log: { address: true, topics: true, data: true },
    transaction: { from: true, to: true, hash: true },
    trace: { error: true },
    stateDiff: { kind: true, next: true, prev: true },
};
/**
 * The portal path's default selection: `IMPLICIT_FIELDS` + `DEFAULT_FIELDS`,
 * written out, because nothing is added for us. Equal to what the gateway path
 * effectively resolves to, so both generations see the same item shapes.
 */
exports.PORTAL_DEFAULT_FIELDS = {
    block: {
        timestamp: true,
    },
    transaction: {
        from: true,
        to: true,
        hash: true,
        gasUsed: true,
        gas: true,
        value: true,
        sighash: true,
        input: true,
        status: true,
        effectiveGasPrice: true,
    },
    log: {
        address: true,
        transactionHash: true,
        topics: true,
        data: true,
    },
    trace: {
        callFrom: true,
        callTo: true,
        callSighash: true,
        callValue: true,
        callInput: true,
        createResultAddress: true,
        suicideRefundAddress: true,
        suicideAddress: true,
        suicideBalance: true,
        error: true,
        revertReason: true,
    },
    stateDiff: {
        kind: true,
        next: true,
        prev: true,
    },
};
/**
 * Per-section shallow merge, `overlay` winning — the same shape of merge the
 * gateway-era SDK applied to `setFields()` against its own defaults.
 * Explicitly-false fields are dropped rather than sent to the portal.
 */
const mergeFieldSelection = (base, overlay) => {
    const keys = new Set([...Object.keys(base), ...Object.keys(overlay ?? {})]);
    const merged = {};
    for (const key of keys) {
        const section = { ...(base[key] ?? {}), ...(overlay?.[key] ?? {}) };
        const selected = Object.fromEntries(Object.entries(section).filter(([, on]) => on === true));
        if (Object.keys(selected).length)
            merged[key] = selected;
    }
    return merged;
};
exports.mergeFieldSelection = mergeFieldSelection;
//# sourceMappingURL=fields.js.map