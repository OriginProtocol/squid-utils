"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTypeormDatabase = exports.withRepairOrphansWorkMem = void 0;
// Raise `work_mem` for the transaction `TypeormDatabase.repairOrphans` runs in.
//
// `repairOrphans` runs inside `initTransaction`, i.e. on every `connect()` — every
// process boot, and once more per boot from `resolveBlockRange`. One of its three
// orphan sweeps does not survive a deep hot window:
//
//     DELETE FROM <schema>.hot_block
//      WHERE height NOT IN (SELECT block_height FROM <schema>.hot_change_log)
//
// `NOT IN` against a subquery is not an anti-join: SQL requires it to answer
// UNKNOWN if the subquery yields a NULL, so Postgres either hashes the whole
// subquery result (`NOT (hashed SubPlan 1)`) or re-scans a Materialize node once
// per outer row (`NOT (SubPlan 1)`). It picks the hashed form only when the
// estimated hash table fits in `work_mem`. That is a cliff, not a gradient — on the
// fixture below, 16MB gives 52.6s and 32MB gives 113ms.
//
// oethb-processor went over that cliff. The Portal SDK derives finality from
// `meta.finalizedHeadNumber` (`@subsquid/evm-stream`'s `DataSourceBuilder` has no
// `setFinalityConfirmation`, so the fixed 50 the gateway path used is unavailable),
// and Base's portal finalized head trails by ~929 blocks. ~1,500 hot blocks x
// ~1,040 change-log rows is ~1.575M rows in `hot_change_log`; the sweep went to
// ~57s, tripped `statement_timeout` and crash-looped the processor at startup —
// with zero orphans actually present to delete.
//
// So the fix is to keep the planner on the hashed side of the cliff, which costs
// one statement and leaves upstream's SQL alone. Reimplementing three upstream
// DELETEs would be a standing maintenance liability (see `portal-cache.ts`, and the
// `portal-client@0.3.2` patch whose *deletion* caused a 16-hour crash-loop), and the
// `NOT IN` NULL trap that would justify it is unreachable through the real schema:
// `hot_change_log` is `PRIMARY KEY (block_height, index)` and `hot_block.height` is
// its PK, and PK columns cannot be NULL.
//
// `SET LOCAL` is transaction-scoped, so it reverts at commit and needs no
// `ALTER DATABASE`/`ALTER ROLE` privilege — nothing outside this transaction sees
// the raised value.
//
// Patched per-instance rather than on the prototype. origin-squid currently
// resolves a single physical copy of `@subsquid/typeorm-store`, so a prototype patch
// would land — but every `TypeormDatabase` in this package is constructed here, so
// we need not bet on that staying true. `portal-cache.ts` documents what the other
// outcome costs: a patch that silently attaches to a copy nobody instantiates.
const typeorm_store_1 = require("@subsquid/typeorm-store");
/**
 * Production needed more than 16MB and less than 32MB at 1.575M `hot_change_log`
 * rows, and the hot window grows, so the default is set with headroom rather than
 * at the measured boundary. `SET LOCAL` means the cost is one transaction on a
 * connection that is otherwise idle at boot, not a global allocation.
 */
const DEFAULT_WORK_MEM = '64MB';
/** `SET LOCAL` takes no bind parameters, so the value is interpolated — only accept a literal Postgres memory setting. */
const WORK_MEM_PATTERN = /^\d+(kB|MB|GB|TB)?$/;
const resolveWorkMem = () => {
    const configured = process.env.SQUID_REPAIR_ORPHANS_WORK_MEM;
    if (!configured)
        return DEFAULT_WORK_MEM;
    if (!WORK_MEM_PATTERN.test(configured)) {
        console.warn(`SQUID_REPAIR_ORPHANS_WORK_MEM=${JSON.stringify(configured)} is not a Postgres memory value ` +
            `(e.g. "64MB"); using ${DEFAULT_WORK_MEM}.`);
        return DEFAULT_WORK_MEM;
    }
    return configured;
};
/**
 * Return `db` with a `repairOrphans` that raises `work_mem` for the enclosing
 * transaction and then delegates to the original, unchanged. Idempotent.
 */
const withRepairOrphansWorkMem = (db) => {
    const self = db;
    // Upstream removed or renamed it: fail loudly on a version bump rather than
    // silently installing a wrapper nothing calls.
    if (typeof self.repairOrphans !== 'function') {
        throw new Error('Unable to raise work_mem for repairOrphans: TypeormDatabase.prototype.repairOrphans is missing. ' +
            'Check whether @subsquid/typeorm-store still needs this polyfill.');
    }
    if (Object.prototype.hasOwnProperty.call(self, 'repairOrphans'))
        return db;
    const original = self.repairOrphans;
    const workMem = resolveWorkMem();
    self.repairOrphans = async function (em) {
        try {
            await em.query(`SET LOCAL work_mem = '${workMem}'`);
        }
        catch (err) {
            // Startup is exactly where we cannot afford a new failure mode: a rejected
            // SET LOCAL leaves the sweeps slow, not broken.
            console.warn(`Failed to raise work_mem to ${workMem} for repairOrphans; continuing at the server default.`, err);
        }
        return original.call(this, em);
    };
    return db;
};
exports.withRepairOrphansWorkMem = withRepairOrphansWorkMem;
/**
 * `new TypeormDatabase(...)` with the `work_mem` wrapper already installed.
 * Use this in place of the constructor at every construction site.
 */
const createTypeormDatabase = (...args) => (0, exports.withRepairOrphansWorkMem)(new typeorm_store_1.TypeormDatabase(...args));
exports.createTypeormDatabase = createTypeormDatabase;
//# sourceMappingURL=repair-orphans-work-mem.js.map