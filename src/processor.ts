import assert from 'assert'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import utc from 'dayjs/plugin/utc'
import { compact } from 'lodash'
import { Chain, createPublicClient, http } from 'viem'
import { arbitrum, base, bsc, mainnet, optimism, plumeMainnet, sonic } from 'viem/chains'

import { EvmBatchProcessor, FieldSelection } from '@subsquid/evm-processor'
import { TypeormDatabase } from '@subsquid/typeorm-store'
import { blockFrequencyTracker } from './blockFrequencyUpdater'
import { calculateBlockRate } from './calculateBlockRate'
import { printStats } from './processing-stats'

import './polyfills/rpc-issues'
import { Block, Context } from './types'

dayjs.extend(duration)
dayjs.extend(utc)

const DEFAULT_FIELDS = {
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
    .setFinalityConfirmation(10)
    .setFields(options?.fields ? options?.fields as typeof DEFAULT_FIELDS : DEFAULT_FIELDS)

  if (process.env.DISABLE_ARCHIVE !== 'true') {
    console.log(`Archive gateway: ${config.gateway}`)
    processor.setGateway(config.gateway)
  } else {
    console.log(`Archive disabled`)
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
}

export interface Processor {
  name?: string
  from?: number
  initialize?: (ctx: Context) => Promise<void> // To only be run once per `sqd process`.
  setup?: (p: ReturnType<typeof createEvmBatchProcessor>, chain?: Chain) => void
  process: (ctx: Context) => Promise<void>
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
    setup: (evmBatchProcessor: ReturnType<typeof createEvmBatchProcessor>, chain?: Chain) => {
      processors.forEach(p => p.setup?.(evmBatchProcessor, chain))
    },
    process: async (ctx: Context) => {
      await Promise.all(processors.map(p => p.process(ctx)))
    }
  };
};

let initialized = false

export interface ChainConfig {
  chain: Chain
  gateway: string
  endpoints: string[]
}

export const chainConfigs = {
  [mainnet.id]: {
    chain: mainnet,
    gateway: 'https://v2.archive.subsquid.io/network/ethereum-mainnet',
    endpoints: compact([
      process.env[process.env.RPC_ENV ?? 'RPC_ENDPOINT'],
      process.env[process.env.RPC_ENV_BACKUP ?? 'RPC_ETH_HTTP'],
    ]),
  },
  [arbitrum.id]: {
    chain: arbitrum,
    gateway: 'https://v2.archive.subsquid.io/network/arbitrum-one',
    endpoints: compact([
      process.env[process.env.RPC_ARBITRUM_ENV ?? 'RPC_ARBITRUM_ENDPOINT'],
      process.env[process.env.RPC_ARBITRUM_ENV_BACKUP ?? 'RPC_ARBITRUM_ONE_HTTP'],
    ]),
  },
  [base.id]: {
    chain: base,
    gateway: 'https://v2.archive.subsquid.io/network/base-mainnet',
    endpoints: compact([
      process.env[process.env.RPC_BASE_ENV ?? 'RPC_BASE_ENDPOINT'],
      process.env[process.env.RPC_BASE_ENV_BACKUP ?? 'RPC_BASE_HTTP'],
    ]),
  },
  [sonic.id]: {
    chain: sonic,
    gateway: 'https://v2.archive.subsquid.io/network/sonic-mainnet',
    endpoints: compact([
      process.env[process.env.RPC_SONIC_ENV ?? 'RPC_SONIC_ENDPOINT'],
      process.env[process.env.RPC_SONIC_ENV_BACKUP ?? 'RPC_SONIC_MAINNET_HTTP'],
    ]),
  },
  [optimism.id]: {
    chain: optimism,
    gateway: 'https://v2.archive.subsquid.io/network/optimism-mainnet',
    endpoints: compact([
      process.env[process.env.RPC_OPTIMISM_ENV ?? 'RPC_OPTIMISM_ENDPOINT'],
      process.env[process.env.RPC_OPTIMISM_ENV_BACKUP ?? 'RPC_OPTIMISM_HTTP'],
    ]),
  },
  [bsc.id]: {
    chain: bsc,
    gateway: 'https://v2.archive.subsquid.io/network/binance-mainnet',
    endpoints: compact([
      process.env[process.env.RPC_BSC_ENV ?? 'RPC_BSC_ENDPOINT'],
      process.env[process.env.RPC_BSC_ENV_BACKUP ?? 'RPC_BSC_HTTP'],
    ]),
  },
  [plumeMainnet.id]: {
    chain: plumeMainnet,
    gateway: 'https://v2.archive.subsquid.io/network/plume',
    endpoints: compact([
      process.env[process.env.RPC_PLUME_ENV ?? 'RPC_PLUME_ENDPOINT'],
      process.env[process.env.RPC_PLUME_ENV_BACKUP ?? 'RPC_PLUME_HTTP'],
    ]),
  },
} as const

export const run = async ({ fromNow, chainId = 1, stateSchema, processors, postProcessors, validators, postValidation, fields }: SquidProcessor) => {
  if (!fromNow) {
    assert(!processors.find((p) => p.from === undefined), 'All processors must have a `from` defined')
  }

  if (process.env.PROCESSOR) {
    processors = processors.filter((p) => p.name?.includes(process.env.PROCESSOR!))
  }
  if (process.env.PROCESSOR) {
    postProcessors = postProcessors?.filter((p) => p.name?.includes(process.env.PROCESSOR!))
  }

  console.log('Processors:\n  -', processors.map((p) => p.name).join('\n  - '))

  const config = chainConfigs[chainId]
  if (!config) throw new Error('No chain configuration found.')
  // console.log('env', JSON.stringify(process.env, null, 2))
  // console.log('config', JSON.stringify(config, null, 2))
  const evmBatchProcessor = createEvmBatchProcessor(config, { fields })


  const client = createPublicClient({ chain: config.chain, transport: http(config.endpoints[0]) })
  const latestBlock = await client.getBlock()

  const database = new TypeormDatabase({ supportHotBlocks: true, stateSchema })

  // In order to resume from the last processed block while having no `from` block declared,
  //   we must pull the state and use that as our `from` block.
  const databaseState = await database.connect()
  const latestHeight = databaseState.height
  await database.disconnect()

  let from = [...processors, ...(postProcessors ?? [])].reduce((min, p) => (p.from && p.from < min ? p.from : min), fromNow ? latestHeight : Number(latestBlock.number))
  if (from === -1 && fromNow) {
    from = Number(latestBlock.number)
  }

  from = process.env.BLOCK_FROM ? Number(process.env.BLOCK_FROM) : from
  const to = process.env.BLOCK_TO ? Number(process.env.BLOCK_TO) : undefined
  evmBatchProcessor.setBlockRange({
    from,
    to,
  })
  processors.forEach((p) => p.setup?.(evmBatchProcessor, config.chain))
  postProcessors?.forEach((p) => p.setup?.(evmBatchProcessor, config.chain))
  const frequencyTracker = blockFrequencyTracker({ from })
  let contextTime = Date.now()
  const averageTimeMap = new Map<string, [number, number]>()
  evmBatchProcessor.run(
    new TypeormDatabase({
      stateSchema,
      supportHotBlocks: true,
      isolationLevel: 'READ COMMITTED',
    }),
    async (_ctx) => {
      const ctx = _ctx as Context
      try {
        ctx.chain = config.chain
        ctx.__state = new Map<string, unknown>()
        if (ctx.blocks.length >= 1) {
          ctx.blockRate = await calculateBlockRate(ctx)
          ctx.log.info(`Block rate: ${ctx.blockRate}`)
        }
        ctx.blocksWithContent = ctx.blocks.filter(
          (b) => b.logs.length > 0 || b.traces.length > 0 || b.transactions.length > 0,
        )
        ctx.frequencyBlocks = ctx.blocks.filter((b) => frequencyTracker(ctx, b))
        ctx.lastBlockPerDay = new Map<string, Block>()
        for (const block of ctx.blocks) {
          if (!block.header.timestamp) continue
          ctx.lastBlockPerDay.set(new Date(block.header.timestamp).toISOString().slice(0, 10), block)
        }
        ctx.latestBlockOfDay = (block: Block) => {
          const date = new Date(block.header.timestamp).toISOString().slice(0, 10)
          return ctx.lastBlockPerDay.get(date) === block || ctx.blocks.at(-1) === block
        }


        let start: number
        const time = (name: string) => () => {
          const timedata = averageTimeMap.get(name) ?? [0, 0]
          timedata[0] += Date.now() - start
          timedata[1] += 1
          averageTimeMap.set(name, timedata)
          const message = `${name} ${timedata[1]}x avg ${(timedata[0] / timedata[1]).toFixed(0)}ms`
          return () => ctx.log.info(message)
        }

        // Initialization Run
        if (!initialized) {
          initialized = true
          ctx.log.info(`initializing`)
          start = Date.now()
          const times = await Promise.all([
            ...processors
              .filter((p) => p.initialize)
              .map((p, index) =>
                p.initialize!(ctx).then(time(p.name ? `initializing ${p.name}` : `initializing processor-${index}`)),
              ),
            ...(postProcessors ?? [])
              .filter((p) => p.initialize)
              .map((p, index) =>
                p.initialize!(ctx).then(
                  time(p.name ? `initializing ${p.name}` : `initializing postProcessors-${index}`),
                ),
              ),
          ])
          times.forEach((t) => t())
        }

        // Main Processing Run
        start = Date.now()
        const times = await Promise.all(
          processors.map((p, index) => p.process(ctx).then(time(p.name ?? `processor-${index}`))),
        )
        if (process.env.DEBUG_PERF === 'true') {
          ctx.log.info('===== Processor Times =====')
          times.forEach((t) => t())
        }

        if (postProcessors) {
          // Post Processing Run
          start = Date.now()
          const postTimes = await Promise.all(
            postProcessors.map((p, index) => p.process(ctx).then(time(p.name ?? `postProcessor-${index}`))),
          )
          if (process.env.DEBUG_PERF === 'true') {
            ctx.log.info('===== Post Processor Times =====')
            postTimes.forEach((t) => t())
          }
        }

        if (validators) {
          // Validation Run
          start = Date.now()
          const validatorTimes = await Promise.all(
            validators.map((p, index) => p.process(ctx).then(time(p.name ?? `validator-${index}`))),
          )
          if (process.env.DEBUG_PERF === 'true') {
            ctx.log.info('===== Validator Times =====')
            validatorTimes.forEach((t) => t())
          }
        }
        if (postValidation) {
          await postValidation(ctx)
        }
      } finally {
        printStats(ctx)
        if (process.env.DEBUG_PERF === 'true') {
          ctx.log.info(
            `===== End of Context ===== (${Date.now() - contextTime}ms, ${ctx.blocks.at(-1)?.header.height})`,
          )
        }
        contextTime = Date.now()
      }
    },
  )
}
