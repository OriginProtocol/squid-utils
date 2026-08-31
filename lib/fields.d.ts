import { FieldSelection as PortalFieldSelection } from '@subsquid/evm-stream';
/**
 * Fields squid-utils asks for on top of whatever the SDK supplies by default.
 * Used by the gateway-era `createEvmBatchProcessor` path.
 */
export declare const DEFAULT_FIELDS: {
    readonly transaction: {
        readonly from: true;
        readonly to: true;
        readonly hash: true;
        readonly gasUsed: true;
        readonly gas: true;
        readonly value: true;
        readonly sighash: true;
        readonly input: true;
        readonly status: true;
        readonly effectiveGasPrice: true;
    };
    readonly log: {
        readonly transactionHash: true;
        readonly topics: true;
        readonly data: true;
    };
    readonly trace: {
        readonly callFrom: true;
        readonly callTo: true;
        readonly callSighash: true;
        readonly callValue: true;
        readonly callInput: true;
        readonly createResultAddress: true;
        readonly suicideRefundAddress: true;
        readonly suicideAddress: true;
        readonly suicideBalance: true;
        readonly error: true;
        readonly revertReason: true;
    };
};
/**
 * Fields the gateway-era SDK merged into every selection implicitly
 * (its own `DEFAULT_FIELDS`). The Portal SDK has no implicit merge, so the
 * portal path has to spell them out or lose them — silently for `log.address`,
 * at compile time for `block.timestamp`.
 */
export declare const IMPLICIT_FIELDS: {
    readonly block: {
        readonly timestamp: true;
    };
    readonly log: {
        readonly address: true;
        readonly topics: true;
        readonly data: true;
    };
    readonly transaction: {
        readonly from: true;
        readonly to: true;
        readonly hash: true;
    };
    readonly trace: {
        readonly error: true;
    };
    readonly stateDiff: {
        readonly kind: true;
        readonly next: true;
        readonly prev: true;
    };
};
/**
 * The portal path's default selection: `IMPLICIT_FIELDS` + `DEFAULT_FIELDS`,
 * written out, because nothing is added for us. Equal to what the gateway path
 * effectively resolves to, so both generations see the same item shapes.
 */
export declare const PORTAL_DEFAULT_FIELDS: {
    readonly block: {
        readonly timestamp: true;
    };
    readonly transaction: {
        readonly from: true;
        readonly to: true;
        readonly hash: true;
        readonly gasUsed: true;
        readonly gas: true;
        readonly value: true;
        readonly sighash: true;
        readonly input: true;
        readonly status: true;
        readonly effectiveGasPrice: true;
    };
    readonly log: {
        readonly address: true;
        readonly transactionHash: true;
        readonly topics: true;
        readonly data: true;
    };
    readonly trace: {
        readonly callFrom: true;
        readonly callTo: true;
        readonly callSighash: true;
        readonly callValue: true;
        readonly callInput: true;
        readonly createResultAddress: true;
        readonly suicideRefundAddress: true;
        readonly suicideAddress: true;
        readonly suicideBalance: true;
        readonly error: true;
        readonly revertReason: true;
    };
    readonly stateDiff: {
        readonly kind: true;
        readonly next: true;
        readonly prev: true;
    };
};
export type PortalFields = typeof PORTAL_DEFAULT_FIELDS;
/**
 * Per-section shallow merge, `overlay` winning — the same shape of merge the
 * gateway-era SDK applied to `setFields()` against its own defaults.
 * Explicitly-false fields are dropped rather than sent to the portal.
 */
export declare const mergeFieldSelection: (base: PortalFieldSelection, overlay: PortalFieldSelection | undefined) => PortalFieldSelection;
