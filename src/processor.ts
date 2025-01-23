import assert from 'assert'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import utc from 'dayjs/plugin/utc'
import { compact } from 'lodash'
import { Chain, createPublicClient, http } from 'viem'
import { arbitrum, base, mainnet, sonic } from 'viem/chains'

import { EvmBatchProcessor, FieldSelection } from '@subsquid/evm-processor'
import { TypeormDatabase } from '@subsquid/typeorm-store'
import { blockFrequencyTracker } from './blockFrequencyUpdater'
import { calculateBlockRate } from './calculateBlockRate'
import { printStats } from './processing-stats'

import './polyfills/rpc-issues'
import { Context } from './types'

dayjs.extend(duration)
dayjs.extend(utc)

export const createEvmBatchProcessor = (config: ChainConfig, options?: {
  fields: FieldSelection
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
    .setFields({
      ...options?.fields,
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
        ...options?.fields?.transaction,
      },
      log: {
        transactionHash: true,
        topics: true,
        data: true,
        ...options?.fields?.log,
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
        ...options?.fields?.trace,
      },
    })

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
      process.env[process.env.RPC_SONIC_ENV_BACKUP ?? 'RPC_SONIC_HTTP'],
    ]),
  },
} as const

export const run = async ({ fromNow, chainId = 1, stateSchema, processors, postProcessors, validators, postValidation }: SquidProcessor) => {
  if (!fromNow) {
    assert(!processors.find((p) => p.from === undefined), 'All processors must have a `from` defined')
  }

  if (process.env.PROCESSOR) {
    processors = processors.filter((p) => p.name?.includes(process.env.PROCESSOR!))
  }
  if (process.env.PROCESSOR) {
    postProcessors = postProcessors?.filter((p) => p.name?.includes(process.env.PROCESSOR!))
  }

  console.log('Processors:\n  - ', processors.map((p) => p.name).join('\n  - '))

  const config = chainConfigs[chainId]
  if (!config) throw new Error('No chain configuration found.')
  // console.log('env', JSON.stringify(process.env, null, 2))
  // console.log('config', JSON.stringify(config, null, 2))
  const evmBatchProcessor = createEvmBatchProcessor(config)


  const client = createPublicClient({ chain: config.chain, transport: http(config.endpoints[0]) })
  const latestBlock = await client.getBlock()

  const database = new TypeormDatabase({ supportHotBlocks: true, stateSchema })

  // In order to resume from the last processed block while having no `from` block declared,
  //   we must pull the state and use that as our `from` block.
  const databaseState = await database.connect()
  const latestHeight = databaseState.height
  await database.disconnect()

  let from = [...processors, ...(postProcessors ?? [])].reduce((min, p) => (p.from && p.from < min ? p.from : min), latestHeight)
  if (from === -1) {
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
  evmBatchProcessor.run(
    new TypeormDatabase({
      stateSchema,
      supportHotBlocks: true,
      isolationLevel: 'READ COMMITTED',
    }),
    async (_ctx) => {
      const ctx = _ctx as Context
      if (!ctx.isHead && Date.now() - contextTime > 5000) {
        ctx.log.info(`===== !! Slow Context !! ===== (${Date.now() - contextTime}ms)`)
      }
      try {
        ctx.chain = config.chain
        ctx.__state = new Map<string, unknown>()
        if (ctx.blocks.length >= 1) {
          ctx.blockRate = await calculateBlockRate(ctx)
        }
        ctx.blocksWithContent = ctx.blocks.filter(
          (b) => b.logs.length > 0 || b.traces.length > 0 || b.transactions.length > 0,
        )
        ctx.frequencyBlocks = ctx.blocks.filter((b) => frequencyTracker(ctx, b))

        let start: number
        const time = (name: string) => () => {
          const message = `${name} ${Date.now() - start}ms`
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
