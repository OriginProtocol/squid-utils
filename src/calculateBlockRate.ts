import { arbitrum, base, mainnet, optimism, sonic } from 'viem/chains'

import { Context } from './types'

const blockRates: Record<number, number> = {
  [mainnet.id]: 12.04,
  [arbitrum.id]: 0.25,
  [base.id]: 2,
  [sonic.id]: 0.6,
  [optimism.id]: 2,
}

export const calculateBlockRate = async (ctx: Context) => {
  const rate = blockRates[ctx.chain.id]
  if (rate) {
    return rate
  }
  throw new Error('No block rate found')
}
