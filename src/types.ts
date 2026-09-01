import { Chain } from 'viem'

import { DataHandlerContext as PortalDataHandlerContext } from '@subsquid/batch-processor'
import { Block as PortalBlockData } from '@subsquid/evm-objects'
import { DataHandlerContext as GatewayDataHandlerContext, EvmBatchProcessorFields } from '@subsquid/evm-processor'
import { EvmStateDiff } from '@subsquid/evm-stream'
import { Logger } from '@subsquid/logger'
import { RpcClient } from '@subsquid/rpc-client'
import { Store } from '@subsquid/typeorm-store'
import { Range } from '@subsquid/util-internal-range'

import { PortalFields } from './fields'
import { createEvmBatchProcessor } from './processor'

export type GatewayEvmBatchProcessor = ReturnType<typeof createEvmBatchProcessor>
export type GatewayFields = EvmBatchProcessorFields<GatewayEvmBatchProcessor>

/**
 * The flat request shapes `logFilter()` / `traceFilter()` /
 * `transactionFilter()` produce, and the ~124 downstream `setup()` bodies pass.
 * Declared here rather than imported so they belong to squid-utils' own
 * registration contract instead of to either SDK generation.
 */
export interface LogRequest {
  address?: string[]
  topic0?: string[]
  topic1?: string[]
  topic2?: string[]
  topic3?: string[]
  transaction?: boolean
  transactionTraces?: boolean
  transactionLogs?: boolean
  transactionStateDiffs?: boolean
}

export interface TransactionRequest {
  to?: string[]
  from?: string[]
  sighash?: string[]
  type?: number[]
  logs?: boolean
  traces?: boolean
  stateDiffs?: boolean
}

export interface TraceRequest {
  type?: string[]
  createFrom?: string[]
  callTo?: string[]
  callFrom?: string[]
  callSighash?: string[]
  suicideRefundAddress?: string[]
  rewardAuthor?: string[]
  transaction?: boolean
  transactionLogs?: boolean
  subtraces?: boolean
  parents?: boolean
}

export interface StateDiffRequest {
  address?: string[]
  key?: string[]
  kind?: EvmStateDiff['kind'][]
  transaction?: boolean
}

/**
 * The registration surface handed to `Processor.setup`.
 *
 * Both generations speak these gateway-era request shapes, so the ~124
 * downstream registrations are identical on either path. The portal builder
 * translates them into the Portal SDK's `{where, include}` form.
 */
export interface ProcessorRegistrar {
  includeAllBlocks(range?: Range): this
  addLog(options: LogRequest & { range?: Range }): this
  addTransaction(options: TransactionRequest & { range?: Range }): this
  addTrace(options: TraceRequest & { range?: Range }): this
  addStateDiff(options: StateDiffRequest & { range?: Range }): this
  setBlockRange(range?: Range): this
}

/**
 * What a `setup(p)` body receives. Named for the type downstream already
 * annotates that parameter with, so those annotations keep compiling on either
 * path; `GatewayEvmBatchProcessor` is the concrete gateway-era class.
 */
export type EvmBatchProcessor = ProcessorRegistrar

/**
 * One of the two SDK generations squid-utils can run on, identified by the
 * handler context its `run()` produces. The consumer types below are written
 * once and parameterized over this, so neither generation needs its own copy.
 */
export interface SdkGeneration<Ctx extends { blocks: any[] }> {
  ctx: Ctx
}

/** `@subsquid/evm-processor` — the gateway-era SDK. Sonic stays here. */
export type GatewaySdk = SdkGeneration<GatewayDataHandlerContext<Store, GatewayFields>>

/**
 * `@subsquid/evm-stream` + `@subsquid/batch-processor`. Its own context is only
 * `{store, blocks, isHead}`; `runPortal()` attaches `_chain` and `log` so the
 * contract-call and logging sites read the same on both paths.
 */
export type PortalSdk = SdkGeneration<
  PortalDataHandlerContext<PortalBlockData<PortalFields>, Store> & {
    _chain: { client: RpcClient }
    log: Logger
  }
>

export type AnySdk = SdkGeneration<any>

export type Context<G extends AnySdk = PortalSdk> = G['ctx'] & {
  chain: Chain
  blockRate: number
  blocksWithContent: Block<G>[]
  lastBlockPerDay: Map<string, Block<G>>
  latestBlockOfDay: (block: Block<G>) => boolean
  frequencyBlocks: Block<G>[]
  __state: Map<string, unknown>
}
export type Block<G extends AnySdk = PortalSdk> = G['ctx']['blocks'][number]
export type Log<G extends AnySdk = PortalSdk> = Block<G>['logs'][number]
export type Transaction<G extends AnySdk = PortalSdk> = Block<G>['transactions'][number]
export type Trace<G extends AnySdk = PortalSdk> = Block<G>['traces'][number]
export type Fields<G extends AnySdk = PortalSdk> = G extends GatewaySdk ? GatewayFields : PortalFields

export type GatewayContext = Context<GatewaySdk>
export type GatewayBlock = Block<GatewaySdk>
export type GatewayLog = Log<GatewaySdk>
export type GatewayTransaction = Transaction<GatewaySdk>
export type GatewayTrace = Trace<GatewaySdk>

export interface EvmProcessor {
  name: string
  from?: number
  chainId: number
  initialize?: (ctx: Context) => Promise<void> // To only be run once per `sqd process`.
  setup?: (p: ProcessorRegistrar, chain: Chain) => void
  process: (ctx: Context) => Promise<void>
}

export interface Processor {
  name?: string
  from?: number
  initialize?: (ctx: Context) => Promise<void> // To only be run once per `sqd process`.
  setup?: (p: ProcessorRegistrar, chain?: Chain) => void
  process: (ctx: Context) => Promise<void>
}
