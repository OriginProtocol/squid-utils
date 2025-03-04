import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import utc from 'dayjs/plugin/utc'
import { base } from 'viem/chains'

import { Block, Context } from './types'

dayjs.extend(duration)
dayjs.extend(utc)

const SECONDS_PER_WEEK = dayjs.duration({ weeks: 1 }).asSeconds()
const SECONDS_PER_DAY = dayjs.duration({ days: 1 }).asSeconds()
const SECONDS_PER_HOUR = dayjs.duration({ hours: 1 }).asSeconds()
const SECONDS_PER_MINUTE = 60

// It's OK that these are only calculated at launch.
const oneYearAgo = dayjs.utc().subtract(1, 'year').valueOf()
const oneMonthAgo = dayjs.utc().subtract(1, 'month').valueOf()
const oneWeekAgo = dayjs.utc().subtract(1, 'week').valueOf()
const oneDayAgo = dayjs.utc().subtract(1, 'day').valueOf()
const oneHourAgo = dayjs.utc().subtract(1, 'hour').valueOf()
const fifteenMinutesAgo = dayjs.utc().subtract(15, 'minutes').valueOf()

const getFrequency = (blockRate: number, timestamp: number, minimumFrequency: number = SECONDS_PER_MINUTE) => {
  if (timestamp < oneYearAgo) {
    return (SECONDS_PER_WEEK / blockRate) ^ 0 // Older than one year ago
  } else if (timestamp < oneMonthAgo) {
    return (SECONDS_PER_DAY / blockRate) ^ 0 // Older than one month ago
  } else if (timestamp < oneWeekAgo) {
    return (SECONDS_PER_DAY / blockRate / 4) ^ 0 // Older than one week ago
  } else if (timestamp < oneDayAgo) {
    return ((SECONDS_PER_MINUTE * 30) / blockRate) ^ 0 // Older than one day ago
  } else if (timestamp < oneHourAgo) {
    return ((SECONDS_PER_MINUTE * 15) / blockRate) ^ 0 // Older than one hour ago
  } else if (timestamp < fifteenMinutesAgo) {
    return ((SECONDS_PER_MINUTE * 5) / blockRate) ^ 0 // Older than 15 minutes ago
  } else {
    return (minimumFrequency / blockRate) ^ 0
  }
}

export const blockFrequencyTracker = (params: {
  from: number
  minimumFrequency?: number
}) => {
  return (ctx: Context, block: Block) => {
    if (block.header.height < params.from) return
    const frequency = getFrequency(ctx.blockRate, block.header.timestamp, params.minimumFrequency)
    return (
      // If our chain is Tenderly, we want to process all blocks.
      // The frequency logic gets messed up on Tenderly forks.
      (ctx._chain.client as any).url.includes('tenderly') ||
      // Normal logic down below.
      block.header.height % frequency === 0 ||
      block.header.height % 100000 === 0 || // For validation generation we need something reliable and unchanging.
      isAerodromeImportantBlock(ctx, block)
    )
  }
}

export const blockFrequencyUpdater = (params: {
  from: number
  parallelProcessing?: boolean
  minimumFrequency?: number
}) => {
  const parallelLimit = 10
  const tracker = blockFrequencyTracker(params)
  return async (ctx: Context, fn: (ctx: Context, block: Block) => Promise<void>) => {
    if (!ctx.blocks.length) return
    if (ctx.blocks[ctx.blocks.length - 1].header.height < params.from) {
      // No applicable blocks in current context.
      return
    }

    const blocksToProcess = ctx.blocks.filter((block) => tracker(ctx, block))
    if (params.parallelProcessing) {
      // Process blocks in parallel with a limit
      for (let i = 0; i < blocksToProcess.length; i += parallelLimit) {
        const chunk = blocksToProcess.slice(i, i + parallelLimit)
        await Promise.all(chunk.map((block) => fn(ctx, block)))
      }
    } else {
      // Process blocks sequentially
      for (const block of blocksToProcess) {
        await fn(ctx, block)
      }
    }
  }
}

// This came around so we can have good historical snapshots of data during Aerodrome epoch flips.
export const isAerodromeImportantBlock = (ctx: Context, block: Block) => {
  if (ctx.chain.id !== base.id) return false
  if (block.header.height < 17819702) return false
  const lastBlockWeek = Math.floor((block.header.timestamp / 1000 - ctx.blockRate) / SECONDS_PER_WEEK)
  const blockWeek = Math.floor(block.header.timestamp / 1000 / SECONDS_PER_WEEK)
  if (blockWeek !== lastBlockWeek) return true

  const nextBlockWeek = Math.floor((block.header.timestamp / 1000 + ctx.blockRate) / SECONDS_PER_WEEK)
  if (blockWeek !== nextBlockWeek) return true

  const secondOfWeek = Math.floor(block.header.timestamp / 1000) % SECONDS_PER_WEEK
  const lastBlockHourOfWeek = Math.floor((secondOfWeek - ctx.blockRate) / SECONDS_PER_HOUR)
  const hourOfWeek = Math.floor(secondOfWeek / SECONDS_PER_HOUR)
  return lastBlockHourOfWeek === 0 && hourOfWeek === 1
}
