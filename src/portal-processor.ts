import { isEqual, uniqWith } from 'lodash'

import { Database, run as runBatchProcessor } from '@subsquid/batch-processor'
import { FieldSelection as GatewayFieldSelection } from '@subsquid/evm-processor'
import { augmentBlock } from '@subsquid/evm-objects'
import {
  DataSourceBuilder,
  EVMDataSource,
  FieldSelection as PortalFieldSelection,
} from '@subsquid/evm-stream'
import { createLogger } from '@subsquid/logger'
import { PortalClient, PortalClientOptions } from '@subsquid/portal-client'
import { RpcClient } from '@subsquid/rpc-client'
import { Store, TypeormDatabase } from '@subsquid/typeorm-store'
import { StreamRequest } from '@subsquid/util-internal-data-source'
import { Range } from '@subsquid/util-internal-range'

import { DEFAULT_FIELDS, IMPLICIT_FIELDS, PORTAL_DEFAULT_FIELDS, PortalFields, mergeFieldSelection } from './fields'
import { createSquidHandler } from './handler'
import { ChainConfig, SquidProcessor, chainConfigs, resolveBlockRange, selectProcessors } from './processor'

// Patches `RpcClient.prototype` — call counting plus the `fixSelfDestructs()`
// correctness fix. The portal path constructs its own `RpcClient`, so this has
// to be applied here too.
import './polyfills/rpc-issues'
import {
  Block,
  Context,
  LogRequest,
  ProcessorRegistrar,
  StateDiffRequest,
  TraceRequest,
  TransactionRequest,
} from './types'

type Registration =
  | { kind: 'includeAllBlocks'; range?: Range }
  | { kind: 'log'; options: LogRequest & { range?: Range } }
  | { kind: 'transaction'; options: TransactionRequest & { range?: Range } }
  | { kind: 'trace'; options: TraceRequest & { range?: Range } }
  | { kind: 'stateDiff'; options: StateDiffRequest & { range?: Range } }

/** Drops `undefined` entries; returns `undefined` when nothing is left. */
const defined = <T extends object>(obj: T): T | undefined => {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined)
  return entries.length ? (Object.fromEntries(entries) as T) : undefined
}

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
const where = <T extends object>(obj: T): T | undefined =>
  defined(
    Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.toLowerCase() : v)) : value,
      ]),
    ) as T,
  )

/**
 * A `DataSourceBuilder` wearing the gateway-era registration API.
 *
 * Downstream `setup(p)` bodies register flat request objects — what
 * `logFilter().value` and friends produce. The Portal SDK wants
 * `{where, include}`. Translating here is what keeps the ~124 registrations
 * across origin-squid / ops-squid / origin-squid-notifications at zero diff.
 */
export class PortalDataSourceBuilder implements ProcessorRegistrar {
  private registrations: Registration[] = []
  private blockRange?: Range

  constructor(
    private portal: PortalClientOptions | PortalClient,
    private fields: PortalFieldSelection,
  ) {}

  includeAllBlocks(range?: Range) {
    this.registrations.push({ kind: 'includeAllBlocks', range })
    return this
  }
  addLog(options: LogRequest & { range?: Range }) {
    this.registrations.push({ kind: 'log', options })
    return this
  }
  addTransaction(options: TransactionRequest & { range?: Range }) {
    this.registrations.push({ kind: 'transaction', options })
    return this
  }
  addTrace(options: TraceRequest & { range?: Range }) {
    this.registrations.push({ kind: 'trace', options })
    return this
  }
  addStateDiff(options: StateDiffRequest & { range?: Range }) {
    this.registrations.push({ kind: 'stateDiff', options })
    return this
  }
  setBlockRange(range?: Range) {
    this.blockRange = range
    return this
  }

  build(): EVMDataSource<PortalFields> {
    const source = new DataSourceBuilder()
      .setPortal(this.portal)
      .setBlockRange(this.blockRange)
      // Runtime selection is dynamic; the static type is pinned to the default
      // so `Context`/`Block`/`Log`/`Trace` stay concrete for consumers.
      .setFields(this.fields as PortalFields)

    // Registrations repeat across processors that watch the same contract;
    // the portal merges queries by concatenation, so dedupe first.
    for (const registration of uniqWith(this.registrations, isEqual)) {
      switch (registration.kind) {
        case 'includeAllBlocks':
          source.includeAllBlocks(registration.range)
          break
        case 'log': {
          const { address, topic0, topic1, topic2, topic3, transaction, transactionTraces, transactionLogs, transactionStateDiffs, range } =
            registration.options
          source.addLog({
            range,
            where: where({ address, topic0, topic1, topic2, topic3 }),
            include: defined({ transaction, transactionTraces, transactionLogs, transactionStateDiffs }),
          })
          break
        }
        case 'transaction': {
          const { to, from, sighash, type, logs, traces, stateDiffs, range } = registration.options
          source.addTransaction({
            range,
            where: where({ to, from, sighash, type }),
            include: defined({ logs, traces, stateDiffs }),
          })
          break
        }
        case 'trace': {
          const { type, createFrom, callTo, callFrom, callSighash, suicideRefundAddress, rewardAuthor, transaction, transactionLogs, subtraces, parents, range } =
            registration.options
          source.addTrace({
            range,
            where: where({ type, createFrom, callTo, callFrom, callSighash, suicideRefundAddress, rewardAuthor }),
            include: defined({ transaction, transactionLogs, subtraces, parents }),
          })
          break
        }
        case 'stateDiff': {
          const { address, key, kind, transaction, range } = registration.options
          source.addStateDiff({
            range,
            where: where({ address, key, kind }),
            include: defined({ transaction }),
          })
          break
        }
      }
    }

    return clampStreamStart(source.build() as EVMDataSource<PortalFields>, this.blockRange?.from)
  }
}

/**
 * `batch-processor` starts every stream at `dbState.height + 1`, so a fresh
 * state schema asks the portal for block 0 and the data source then scans the
 * whole gap up to the first query's range with an empty request. The gateway
 * processor started at `max(dbHeight + 1, blockRange.from)` instead; this
 * restores that, and drops `parentHash` when it moves the start, since the
 * recorded head is then below the range and no longer the stream's parent.
 */
const clampStreamStart = (
  src: EVMDataSource<PortalFields>,
  from: number | undefined,
): EVMDataSource<PortalFields> => {
  if (from == null) return src
  const clamp = (req: StreamRequest): StreamRequest =>
    req.from >= from ? req : { ...req, from, parentHash: undefined }
  return {
    getHead: () => src.getHead(),
    getFinalizedHead: () => src.getFinalizedHead(),
    getStream: (req) => src.getStream(clamp(req)),
    getFinalizedStream: (req) => src.getFinalizedStream(clamp(req)),
    getBlocksCountInRange: src.getBlocksCountInRange?.bind(src),
  }
}

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
export const createPortalClient = (config: ChainConfig) => {
  const apiKey = process.env.SQD_API_KEY
  return new PortalClient({
    url: config.portal,
    http: apiKey ? { headers: { 'x-api-key': apiKey } } : undefined,
  })
}

/** Portal data source for a chain, optionally over a caller-supplied client. */
export const createPortalDataSource = (
  config: ChainConfig,
  options?: { fields?: GatewayFieldSelection; client?: PortalClient },
) => {
  console.log(`Portal url: ${config.portal}`)
  return new PortalDataSourceBuilder(
    options?.client ?? createPortalClient(config),
    // No implicit merge in the Portal SDK: whatever the caller asks for is
    // layered onto the fields the gateway-era SDK used to add for free.
    mergeFieldSelection(IMPLICIT_FIELDS, (options?.fields ?? DEFAULT_FIELDS) as PortalFieldSelection),
  )
}

/**
 * Run a squid on the Portal SDK — `@subsquid/evm-stream` +
 * `@subsquid/batch-processor`, consuming the portal's real-time `/stream`
 * rather than polling an RPC endpoint for the chain head.
 *
 * Same `SquidProcessor` shape as `run()`. Sonic has no real-time portal
 * dataset and stays on `run()`.
 */
export const runPortal = async (squidProcessor: SquidProcessor) => {
  const { fromNow, chainId = 1, stateSchema, validators, postValidation, fields, portalClient } = squidProcessor
  const { processors, postProcessors } = selectProcessors(squidProcessor)

  const config = chainConfigs[chainId]
  if (!config) throw new Error('No chain configuration found.')

  const builder = createPortalDataSource(config, { fields, client: portalClient })

  const { from, to } = await resolveBlockRange({
    config,
    stateSchema,
    fromNow,
    processors: [...processors, ...(postProcessors ?? [])],
  })
  builder.setBlockRange({ from, to })

  processors.forEach((p) => p.setup?.(builder, config.chain))
  postProcessors?.forEach((p) => p.setup?.(builder, config.chain))

  const dataSource = builder.build()

  // The new `DataHandlerContext` is only `{store, blocks, isHead}`. Contract
  // calls read `ctx._chain.client` and 127 sites read `ctx.log`, so both are
  // wired here rather than by the SDK.
  const url = config.endpoints[0] || 'http://localhost:8545'
  console.log('rpc url', url)
  const client = new RpcClient({
    url,
    maxBatchCallSize: url.includes('alchemy.com') ? 1 : 100,
  })
  const log = createLogger('sqd:processor:mapping')

  const handler = createSquidHandler({
    chain: config.chain,
    from,
    processors,
    postProcessors,
    validators,
    postValidation,
  })

  runBatchProcessor(
    dataSource,
    // `supportHotBlocks: true` is what selects the portal's live `/stream`
    // over `/finalized` — the entire payoff of this path.
    new TypeormDatabase({
      stateSchema,
      supportHotBlocks: true,
      isolationLevel: 'READ COMMITTED',
    }) as unknown as Database<Store>,
    async (ctx) => {
      const squidCtx = ctx as unknown as Context
      squidCtx.blocks = ctx.blocks.map(augmentBlock) as Block[]
      squidCtx._chain = { client }
      squidCtx.log = log
      await handler(squidCtx)
    },
  )
}

export { PORTAL_DEFAULT_FIELDS }
