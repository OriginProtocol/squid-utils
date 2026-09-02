"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PORTAL_DEFAULT_FIELDS = exports.runPortal = exports.createPortalDataSource = exports.createPortalClient = exports.PortalDataSourceBuilder = void 0;
const lodash_1 = require("lodash");
const batch_processor_1 = require("@subsquid/batch-processor");
const evm_objects_1 = require("@subsquid/evm-objects");
const evm_stream_1 = require("@subsquid/evm-stream");
const logger_1 = require("@subsquid/logger");
const portal_client_1 = require("@subsquid/portal-client");
const rpc_client_1 = require("@subsquid/rpc-client");
const fields_1 = require("./fields");
Object.defineProperty(exports, "PORTAL_DEFAULT_FIELDS", { enumerable: true, get: function () { return fields_1.PORTAL_DEFAULT_FIELDS; } });
const handler_1 = require("./handler");
const processor_1 = require("./processor");
// Patches `RpcClient.prototype` — call counting plus the `fixSelfDestructs()`
// correctness fix. The portal path constructs its own `RpcClient`, so this has
// to be applied here too.
require("./polyfills/rpc-issues");
// Raises `work_mem` for `repairOrphans`. This path's deeper hot window (portal
// finality, not a fixed 50 confirmations) is what pushed the sweep over the
// planner's cliff, but both paths construct a TypeormDatabase and both get it.
const repair_orphans_work_mem_1 = require("./polyfills/repair-orphans-work-mem");
/** Drops `undefined` entries; returns `undefined` when nothing is left. */
const defined = (obj) => {
    const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
};
/**
 * `defined()` plus the gateway processor's `mapRequest` normalization —
 * lowercase every string inside an array-valued filter field, which is where
 * addresses, topics and sighashes live.
 *
 * The portal matches hex exactly and evm-stream normalizes nothing, so a
 * checksummed address in a registration matches zero blocks and fails silently.
 * The gateway did this for free; doing it here is what keeps that guarantee for
 * registrations that don't go through `logFilter`/`traceFilter`/
 * `transactionFilter` (which lowercase on their own).
 */
const where = (obj) => defined(Object.fromEntries(Object.entries(obj).map(([key, value]) => [
    key,
    Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.toLowerCase() : v)) : value,
])));
/**
 * A `DataSourceBuilder` wearing the gateway-era registration API.
 *
 * Downstream `setup(p)` bodies register flat request objects — what
 * `logFilter().value` and friends produce. The Portal SDK wants
 * `{where, include}`. Translating here is what keeps the ~124 registrations
 * across origin-squid / ops-squid / origin-squid-notifications at zero diff.
 */
class PortalDataSourceBuilder {
    portal;
    fields;
    registrations = [];
    blockRange;
    constructor(portal, fields) {
        this.portal = portal;
        this.fields = fields;
    }
    includeAllBlocks(range) {
        this.registrations.push({ kind: 'includeAllBlocks', range });
        return this;
    }
    addLog(options) {
        this.registrations.push({ kind: 'log', options });
        return this;
    }
    addTransaction(options) {
        this.registrations.push({ kind: 'transaction', options });
        return this;
    }
    addTrace(options) {
        this.registrations.push({ kind: 'trace', options });
        return this;
    }
    addStateDiff(options) {
        this.registrations.push({ kind: 'stateDiff', options });
        return this;
    }
    setBlockRange(range) {
        this.blockRange = range;
        return this;
    }
    build() {
        const source = new evm_stream_1.DataSourceBuilder()
            .setPortal(this.portal)
            .setBlockRange(this.blockRange)
            // Runtime selection is dynamic; the static type is pinned to the default
            // so `Context`/`Block`/`Log`/`Trace` stay concrete for consumers.
            .setFields(this.fields);
        // Registrations repeat across processors that watch the same contract;
        // the portal merges queries by concatenation, so dedupe first.
        for (const registration of (0, lodash_1.uniqWith)(this.registrations, lodash_1.isEqual)) {
            switch (registration.kind) {
                case 'includeAllBlocks':
                    source.includeAllBlocks(registration.range);
                    break;
                case 'log': {
                    const { address, topic0, topic1, topic2, topic3, transaction, transactionTraces, transactionLogs, transactionStateDiffs, range } = registration.options;
                    source.addLog({
                        range,
                        where: where({ address, topic0, topic1, topic2, topic3 }),
                        include: defined({ transaction, transactionTraces, transactionLogs, transactionStateDiffs }),
                    });
                    break;
                }
                case 'transaction': {
                    const { to, from, sighash, type, logs, traces, stateDiffs, range } = registration.options;
                    source.addTransaction({
                        range,
                        where: where({ to, from, sighash, type }),
                        include: defined({ logs, traces, stateDiffs }),
                    });
                    break;
                }
                case 'trace': {
                    const { type, createFrom, callTo, callFrom, callSighash, suicideRefundAddress, rewardAuthor, transaction, transactionLogs, subtraces, parents, range } = registration.options;
                    source.addTrace({
                        range,
                        where: where({ type, createFrom, callTo, callFrom, callSighash, suicideRefundAddress, rewardAuthor }),
                        include: defined({ transaction, transactionLogs, subtraces, parents }),
                    });
                    break;
                }
                case 'stateDiff': {
                    const { address, key, kind, transaction, range } = registration.options;
                    source.addStateDiff({
                        range,
                        where: where({ address, key, kind }),
                        include: defined({ transaction }),
                    });
                    break;
                }
            }
        }
        return clampStreamStart(source.build(), this.blockRange?.from);
    }
}
exports.PortalDataSourceBuilder = PortalDataSourceBuilder;
/**
 * `batch-processor` starts every stream at `dbState.height + 1`, so a fresh
 * state schema asks the portal for block 0 and the data source then scans the
 * whole gap up to the first query's range with an empty request. The gateway
 * processor started at `max(dbHeight + 1, blockRange.from)` instead; this
 * restores that, and drops `parentHash` when it moves the start, since the
 * recorded head is then below the range and no longer the stream's parent.
 */
const clampStreamStart = (src, from) => {
    if (from == null)
        return src;
    const clamp = (req) => req.from >= from ? req : { ...req, from, parentHash: undefined };
    return {
        getHead: () => src.getHead(),
        getFinalizedHead: () => src.getFinalizedHead(),
        getStream: (req) => src.getStream(clamp(req)),
        getFinalizedStream: (req) => src.getFinalizedStream(clamp(req)),
        getBlocksCountInRange: src.getBlocksCountInRange?.bind(src),
    };
};
/**
 * The `PortalClient` this path would build for a chain. `SQD_API_KEY` rides
 * along as `x-api-key` natively, so this needs none of
 * `polyfills/portal-api-key.ts` — that patch exists only because the gateway
 * path's SDK hardcodes its headers.
 *
 * Exported so a consumer can build the standard client, wrap the *instance*
 * (caching, metrics), and hand it back via `SquidProcessor.portalClient`.
 * Wrapping an instance is the only safe way to do it: the dependency tree can
 * resolve several physically distinct `portal-client` copies, so a
 * `PortalClient.prototype` patch may well attach to a class nobody here
 * instantiates.
 */
const createPortalClient = (config) => {
    const apiKey = process.env.SQD_API_KEY;
    return new portal_client_1.PortalClient({
        url: config.portal,
        http: apiKey ? { headers: { 'x-api-key': apiKey } } : undefined,
    });
};
exports.createPortalClient = createPortalClient;
/** Portal data source for a chain, optionally over a caller-supplied client. */
const createPortalDataSource = (config, options) => {
    console.log(`Portal url: ${config.portal}`);
    return new PortalDataSourceBuilder(options?.client ?? (0, exports.createPortalClient)(config), 
    // No implicit merge in the Portal SDK: whatever the caller asks for is
    // layered onto the fields the gateway-era SDK used to add for free.
    (0, fields_1.mergeFieldSelection)(fields_1.IMPLICIT_FIELDS, (options?.fields ?? fields_1.DEFAULT_FIELDS)));
};
exports.createPortalDataSource = createPortalDataSource;
/**
 * Run a squid on the Portal SDK — `@subsquid/evm-stream` +
 * `@subsquid/batch-processor`, consuming the portal's real-time `/stream`
 * rather than polling an RPC endpoint for the chain head.
 *
 * Same `SquidProcessor` shape as `run()`. Sonic has no real-time portal
 * dataset and stays on `run()`.
 */
const runPortal = async (squidProcessor) => {
    const { fromNow, chainId = 1, stateSchema, validators, postValidation, fields, portalClient } = squidProcessor;
    const { processors, postProcessors } = (0, processor_1.selectProcessors)(squidProcessor);
    const config = processor_1.chainConfigs[chainId];
    if (!config)
        throw new Error('No chain configuration found.');
    const builder = (0, exports.createPortalDataSource)(config, { fields, client: portalClient });
    const { from, to } = await (0, processor_1.resolveBlockRange)({
        config,
        stateSchema,
        fromNow,
        processors: [...processors, ...(postProcessors ?? [])],
    });
    builder.setBlockRange({ from, to });
    processors.forEach((p) => p.setup?.(builder, config.chain));
    postProcessors?.forEach((p) => p.setup?.(builder, config.chain));
    const dataSource = builder.build();
    // The new `DataHandlerContext` is only `{store, blocks, isHead}`. Contract
    // calls read `ctx._chain.client` and 127 sites read `ctx.log`, so both are
    // wired here rather than by the SDK.
    const url = config.endpoints[0] || 'http://localhost:8545';
    console.log('rpc url', url);
    const client = new rpc_client_1.RpcClient({
        url,
        maxBatchCallSize: url.includes('alchemy.com') ? 1 : 100,
    });
    const log = (0, logger_1.createLogger)('sqd:processor:mapping');
    const handler = (0, handler_1.createSquidHandler)({
        chain: config.chain,
        from,
        processors,
        postProcessors,
        validators,
        postValidation,
    });
    (0, batch_processor_1.run)(dataSource, 
    // `supportHotBlocks: true` is what selects the portal's live `/stream`
    // over `/finalized` — the entire payoff of this path.
    (0, repair_orphans_work_mem_1.createTypeormDatabase)({
        stateSchema,
        supportHotBlocks: true,
        isolationLevel: 'READ COMMITTED',
    }), async (ctx) => {
        const squidCtx = ctx;
        squidCtx.blocks = ctx.blocks.map(evm_objects_1.augmentBlock);
        squidCtx._chain = { client };
        squidCtx.log = log;
        await handler(squidCtx);
    });
};
exports.runPortal = runPortal;
//# sourceMappingURL=portal-processor.js.map