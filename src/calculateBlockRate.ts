import { Block, Context } from './types';

let lastContextBlock: Block['header'] | null = null

/**
 * Calculates the average block rate in seconds from the context blocks
 * Falls back to previous context if needed, defaults to 1 second if no data available
 */
export const calculateBlockRate = async (ctx: Context) => {
  const latestBlock = ctx.blocks[ctx.blocks.length - 1]

  // Update state for next context
  // Move this to end of function
  let blockRateResult = 1 // Default fallback

  // If we have multiple blocks in current context, use those
  if (ctx.blocks.length >= 2) {
    const firstBlock = ctx.blocks[0]
    const timeDiffSeconds = (latestBlock.header.timestamp - firstBlock.header.timestamp) / 1000
    const blockDiff = latestBlock.header.height - firstBlock.header.height
    blockRateResult = timeDiffSeconds / blockDiff
  }

  // If we have one block and previous context data, use that
  if (ctx.blocks.length === 1 && lastContextBlock) {
    const timeDiffSeconds = (latestBlock.header.timestamp - lastContextBlock.timestamp) / 1000
    const blockDiff = latestBlock.header.height - lastContextBlock.height
    blockRateResult = timeDiffSeconds / blockDiff
  }

  // Update state for next context at the end
  if (latestBlock) {
    lastContextBlock = latestBlock.header
  }

  return blockRateResult || 1
}
