import { Chain } from 'viem'

import { blockFrequencyTracker } from './blockFrequencyUpdater'
import { calculateBlockRate } from './calculateBlockRate'
import { printStats } from './processing-stats'
import { Block, Context, Processor } from './types'

export interface SquidHandlerOptions {
  chain: Chain
  from: number
  processors: Processor[]
  postProcessors?: Processor[]
  validators?: Pick<Processor, 'process' | 'name'>[]
  postValidation?: (ctx: Context) => Promise<void>
}

/**
 * The batch handler shared by both SDK generations.
 *
 * Everything generation-specific — `_chain`, `log`, block augmentation — is
 * attached by the caller before the returned function runs, so this stays the
 * single definition of what a squid context carries and in what order
 * processors run.
 */
export const createSquidHandler = ({
  chain,
  from,
  processors,
  postProcessors,
  validators,
  postValidation,
}: SquidHandlerOptions) => {
  const frequencyTracker = blockFrequencyTracker({ from })
  const averageTimeMap = new Map<string, [number, number]>()
  let contextTime = Date.now()
  let initialized = false

  return async (ctx: Context) => {
    try {
      ctx.chain = chain
      ctx.__state = new Map<string, unknown>()
      if (ctx.blocks.length >= 1) {
        ctx.blockRate = await calculateBlockRate(ctx)
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
              p.initialize!(ctx).then(time(p.name ? `initializing ${p.name}` : `initializing postProcessors-${index}`)),
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
        ctx.log.info(`===== End of Context ===== (${Date.now() - contextTime}ms, ${ctx.blocks.at(-1)?.header.height})`)
      }
      contextTime = Date.now()
    }
  }
}
