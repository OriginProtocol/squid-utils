import { FieldSelection as PortalFieldSelection } from '@subsquid/evm-stream'

/**
 * Fields squid-utils asks for on top of whatever the SDK supplies by default.
 * Used by the gateway-era `createEvmBatchProcessor` path.
 */
export const DEFAULT_FIELDS = {
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
} as const

/**
 * Fields the gateway-era SDK merged into every selection implicitly
 * (its own `DEFAULT_FIELDS`). The Portal SDK has no implicit merge, so the
 * portal path has to spell them out or lose them — silently for `log.address`,
 * at compile time for `block.timestamp`.
 */
export const IMPLICIT_FIELDS = {
  block: { timestamp: true },
  log: { address: true, topics: true, data: true },
  transaction: { from: true, to: true, hash: true },
  trace: { error: true },
  stateDiff: { kind: true, next: true, prev: true },
} as const

/**
 * The portal path's default selection: `IMPLICIT_FIELDS` + `DEFAULT_FIELDS`,
 * written out, because nothing is added for us. Equal to what the gateway path
 * effectively resolves to, so both generations see the same item shapes.
 */
export const PORTAL_DEFAULT_FIELDS = {
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
} as const

export type PortalFields = typeof PORTAL_DEFAULT_FIELDS

type Section = Record<string, boolean | undefined>

/**
 * Per-section shallow merge, `overlay` winning — the same shape of merge the
 * gateway-era SDK applied to `setFields()` against its own defaults.
 * Explicitly-false fields are dropped rather than sent to the portal.
 */
export const mergeFieldSelection = (
  base: PortalFieldSelection,
  overlay: PortalFieldSelection | undefined,
): PortalFieldSelection => {
  const keys = new Set([...Object.keys(base), ...Object.keys(overlay ?? {})]) as Set<keyof PortalFieldSelection>
  const merged: Record<string, Section> = {}
  for (const key of keys) {
    const section = { ...((base[key] ?? {}) as Section), ...((overlay?.[key] ?? {}) as Section) }
    const selected = Object.fromEntries(Object.entries(section).filter(([, on]) => on === true))
    if (Object.keys(selected).length) merged[key] = selected
  }
  return merged as PortalFieldSelection
}
