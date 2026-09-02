import assert from 'assert'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import utc from 'dayjs/plugin/utc'
import { compact, isEqual, uniqWith } from 'lodash'
import { Chain, createPublicClient, http } from 'viem'
import { arbitrum, base, bsc, hyperEvm, mainnet, optimism, sonic } from 'viem/chains'

import { EvmBatchProcessor, FieldSelection } from '@subsquid/evm-processor'
import { PortalClient } from '@subsquid/portal-client'
import { DEFAULT_FIELDS } from './fields'
import { createSquidHandler } from './handler'

import './polyfills/rpc-issues'
import { registerPortalUrl } from './polyfills/portal-api-key'
// Raises `work_mem` for the transaction `repairOrphans` runs in, keeping its
// `NOT IN` sweeps on the hashed-SubPlan side of the planner's cliff.
import { createTypeormDatabase } from './polyfills/repair-orphans-work-mem'
import { Context, GatewayContext, Processor } from './types'

dayjs.extend(duration)
dayjs.extend(utc)

export const createEvmBatchProcessor = (config: ChainConfig, options?: {
  fields?: FieldSelection
}) => {
  const url = config.endpoints[0] || 'http://localhost:8545'
  console.log('rpc url', url)
  const processor = new EvmBatchProcessor()
    .setRpcEndpoint({
      url,
      maxBatchCallSize: url.includes('alchemy.com') ? 1 : 100,
      // rateLimit: url.includes('sqd_rpc') ? 100 : undefined,
    })
    .setRpcDataIngestionSettings({
      disabled: process.env.ARCHIVE_ONLY === 'true',
      headPollInterval: 5000,
    })
    .setFinalityConfirmation(50)
    .setFields(options?.fields ? options?.fields as typeof DEFAULT_FIELDS : DEFAULT_FIELDS)

  if (process.env.DISABLE_PORTAL !== 'true') {
    console.log(`Portal url: ${config.portal}`)
    registerPortalUrl(config.portal)
    processor.setPortal(config.portal)
  } else if (process.env.DISABLE_ARCHIVE !== 'true') {
    console.log(`Gateway url: ${config.gateway}`)
    processor.setGateway(config.gateway)
  } else {
    console.log(`Portal disabled`)
  }

  return processor
}

export interface SquidProcessor {
  fromNow?: boolean
  chainId?: keyof typeof chainConfigs
  stateSchema: string
  processors: Processor[]
  postProcessors?: Processor[]
  validators?: Pick<Processor, 'process' | 'name'>[]
  postValidation?: (ctx: Context) => Promise<void>
  fields?: FieldSelection
  /**
   * Portal path only. Supply a client — typically `createPortalClient(config)`
   * wrapped by the caller — instead of letting `runPortal()` build its own.
   * Ignored by the gateway `run()` path, whose SDK takes only a URL.
   */
  portalClient?: PortalClient
}

export const defineSquidProcessor = (p: SquidProcessor) => p
export const defineProcessor = (p: Processor) => p
export const joinProcessors = (name: string, processors: Processor[]): Processor => {
  return {
    name,
    from: processors.reduce(
      (min, p) => (p.from != null && (min == null || p.from < min)) ? p.from : min,
      undefined as number | undefined
    ),
    initialize: async (ctx: Context) => {
      await Promise.all(processors.map(p => p.initialize?.(ctx)))
    },
    setup: (registrar, chain?: Chain) => {
      processors.forEach(p => p.setup?.(registrar, chain))
    },
    process: async (ctx: Context) => {
      await Promise.all(processors.map(p => p.process(ctx)))
    }
  };
};

export interface ChainConfig {
  chain: Chain
  gateway: string
  portal: string
  endpoints: string[]
}

// The shared portal requires `SQD_API_KEY`; without a key we fall back to the public one.
const portalUrl = (dataset: string) =>
  process.env.SQD_API_KEY
    ? `https://shared.portal.sqd.dev/datasets/${dataset}`
    : `https://portal.sqd.dev/datasets/${dataset}`

export const chainConfigs = {
  [mainnet.id]: {
    chain: mainnet,
    gateway: 'https://v2.archive.subsquid.io/network/ethereum-mainnet',
    portal: process.env.PORTAL_URL_ETHEREUM ?? portalUrl('ethereum-mainnet'),
    endpoints: compact([
      process.env[process.env.RPC_ENV ?? 'RPC_ENDPOINT'],
      process.env[process.env.RPC_ENV_BACKUP ?? 'RPC_ETH_HTTP'],
    ]),
  },
  [arbitrum.id]: {
    chain: arbitrum,
    gateway: 'https://v2.archive.subsquid.io/network/arbitrum-one',
    portal: process.env.PORTAL_URL_ARBITRUM ?? portalUrl('arbitrum-one'),
    endpoints: compact([
      process.env[process.env.RPC_ARBITRUM_ENV ?? 'RPC_ARBITRUM_ENDPOINT'],
      process.env[process.env.RPC_ARBITRUM_ENV_BACKUP ?? 'RPC_ARBITRUM_ONE_HTTP'],
    ]),
  },
  [base.id]: {
    chain: base,
    gateway: 'https://v2.archive.subsquid.io/network/base-mainnet',
    portal: process.env.PORTAL_URL_BASE ?? portalUrl('base-mainnet'),
    endpoints: compact([
      process.env[process.env.RPC_BASE_ENV ?? 'RPC_BASE_ENDPOINT'],
      process.env[process.env.RPC_BASE_ENV_BACKUP ?? 'RPC_BASE_HTTP'],
    ]),
  },
  [sonic.id]: {
    chain: sonic,
    gateway: 'https://v2.archive.subsquid.io/network/sonic-mainnet',
    portal: process.env.PORTAL_URL_SONIC ?? portalUrl('sonic-mainnet'),
    endpoints: compact([
      process.env[process.env.RPC_SONIC_ENV ?? 'RPC_SONIC_ENDPOINT'],
      process.env[process.env.RPC_SONIC_ENV_BACKUP ?? 'RPC_SONIC_MAINNET_HTTP'],
    ]),
  },
  [optimism.id]: {
    chain: optimism,
    gateway: 'https://v2.archive.subsquid.io/network/optimism-mainnet',
    portal: process.env.PORTAL_URL_OPTIMISM ?? portalUrl('optimism-mainnet'),
    endpoints: compact([
      process.env[process.env.RPC_OPTIMISM_ENV ?? 'RPC_OPTIMISM_ENDPOINT'],
      process.env[process.env.RPC_OPTIMISM_ENV_BACKUP ?? 'RPC_OPTIMISM_HTTP'],
    ]),
  },
  [bsc.id]: {
    chain: bsc,
    gateway: 'https://v2.archive.subsquid.io/network/binance-mainnet',
    portal: process.env.PORTAL_URL_BSC ?? portalUrl('binance-mainnet'),
    endpoints: compact([
      process.env[process.env.RPC_BSC_ENV ?? 'RPC_BSC_ENDPOINT'],
      process.env[process.env.RPC_BSC_ENV_BACKUP ?? 'RPC_BSC_HTTP'],
    ]),
  },
  [hyperEvm.id]: {
    chain: hyperEvm,
    gateway: 'https://v2.archive.subsquid.io/network/hyperliquid-mainnet',
    portal: process.env.PORTAL_URL_HYPEREVM ?? portalUrl('hyperliquid-mainnet'),
    endpoints: compact([
      process.env[process.env.RPC_HYPEREVM_ENV ?? 'RPC_HYPEREVM_ENDPOINT'],
      process.env[process.env.RPC_HYPEREVM_ENV_BACKUP ?? 'RPC_HYPEREVM_HTTP'],
    ]),
  },
} as const

/**
 * Resolve the block to start from, honouring `BLOCK_FROM`/`BLOCK_TO`,
 * `fromNow`, and the height already persisted in `stateSchema`.
 * Shared by both SDK generations.
 */
export const resolveBlockRange = async ({
  config,
  stateSchema,
  fromNow,
  processors,
}: {
  config: ChainConfig
  stateSchema: string
  fromNow?: boolean
  processors: Processor[]
}) => {
  const client = createPublicClient({ chain: config.chain, transport: http(config.endpoints[0]) })
  const latestBlock = await client.getBlock()

  // In order to resume from the last processed block while having no `from` block declared,
  //   we must pull the state and use that as our `from` block.
  const database = createTypeormDatabase({ supportHotBlocks: true, stateSchema })
  const databaseState = await database.connect()
  const latestHeight = databaseState.height
  await database.disconnect()

  let from = processors.reduce(
    (min, p) => (p.from && p.from < min ? p.from : min),
    fromNow ? latestHeight : Number(latestBlock.number),
  )
  if (from === -1 && fromNow) {
    from = Number(latestBlock.number)
  }

  return {
    from: process.env.BLOCK_FROM ? Number(process.env.BLOCK_FROM) : from,
    to: process.env.BLOCK_TO ? Number(process.env.BLOCK_TO) : undefined,
  }
}

/**
 * Select the processors this container should run, honouring `PROCESSOR`.
 * Shared by both SDK generations.
 */
export const selectProcessors = ({ fromNow, processors, postProcessors }: SquidProcessor) => {
  if (!fromNow) {
    assert(!processors.find((p) => p.from === undefined), 'All processors must have a `from` defined')
  }
  if (process.env.PROCESSOR) {
    processors = processors.filter((p) => p.name?.includes(process.env.PROCESSOR!))
    postProcessors = postProcessors?.filter((p) => p.name?.includes(process.env.PROCESSOR!))
  }
  console.log('Processors:\n  -', processors.map((p) => p.name).join('\n  - '))
  return { processors, postProcessors }
}

export const run = async (squidProcessor: SquidProcessor) => {
  const { fromNow, chainId = 1, stateSchema, validators, postValidation, fields } = squidProcessor
  const { processors, postProcessors } = selectProcessors(squidProcessor)

  const config = chainConfigs[chainId]
  if (!config) throw new Error('No chain configuration found.')
  const evmBatchProcessor = createEvmBatchProcessor(config, { fields })

  const { from, to } = await resolveBlockRange({
    config,
    stateSchema,
    fromNow,
    processors: [...processors, ...(postProcessors ?? [])],
  })
  evmBatchProcessor.setBlockRange({ from, to })

  processors.forEach((p) => p.setup?.(evmBatchProcessor, config.chain))
  postProcessors?.forEach((p) => p.setup?.(evmBatchProcessor, config.chain))

  const evmBatchProcessorWithRequests: { requests: any[] } = evmBatchProcessor as any
  evmBatchProcessorWithRequests.requests = uniqWith(evmBatchProcessorWithRequests.requests, isEqual)

  const handler = createSquidHandler({
    chain: config.chain,
    from,
    processors,
    postProcessors,
    validators,
    postValidation,
  })

  evmBatchProcessor.run(
    createTypeormDatabase({
      stateSchema,
      supportHotBlocks: true,
      isolationLevel: 'READ COMMITTED',
    }),
    // The gateway-era context carries the same decorations under different
    // generic parameters; `createSquidHandler` only reads what both provide.
    async (ctx) => handler(ctx as GatewayContext as unknown as Context),
  )
}
