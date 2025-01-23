import { pad as viemPad } from 'viem'


import { Transaction } from './types'

const pad = (hex: string) => viemPad(hex as `0x${string}`)
const lower = (hex: string) => hex.toLowerCase()
const prepare = (hex: string) => pad(lower(hex))

export interface TransactionFilter {
  from?: string[]
  to?: string[]
  sighash?: string[]
  logs?: string[]
  traces?: string[]
  stateDiffs?: string[]
  range?: { from: number; to?: number }
}

/**
 * Helper to create and match logs, ensuring hex values are lowercase and properly padded.
 */
export const transactionFilter = (filter: TransactionFilter) => {
  filter = {
    from: filter.from?.map(lower),
    to: filter.to?.map(lower),
    sighash: filter.sighash?.map(lower),
    logs: filter.logs,
    traces: filter.traces,
    stateDiffs: filter.stateDiffs,
    range: filter.range,
  }
  return {
    value: filter,
    matches(transaction: Transaction) {
      if (filter.from && !filter.from.includes(transaction.from)) {
        return false
      }
      if (filter.to && (!transaction.to || !filter.to.includes(transaction.to))) {
        return false
      }
      if (filter.sighash && !filter.sighash.includes(transaction.sighash)) {
        return false
      }
      if (
        filter.range &&
        (transaction.block.height < filter.range.from ||
          (filter.range.to && transaction.block.height > filter.range.to))
      ) {
        return false
      }
      return true
    },
  } as const
}