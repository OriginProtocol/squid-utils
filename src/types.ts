import { Chain } from 'viem'

import { DataHandlerContext, EvmBatchProcessorFields } from '@subsquid/evm-processor'
import { Store } from '@subsquid/typeorm-store'

import { createEvmBatchProcessor } from './processor'

export type EvmBatchProcessor = ReturnType<typeof createEvmBatchProcessor>
export type Fields = EvmBatchProcessorFields<EvmBatchProcessor>
export type Context = DataHandlerContext<Store, Fields> & {
  chain: Chain
  blockRate: number
  blocksWithContent: Block[]
  lastBlockPerDay: Map<string, Block>
  latestBlockOfDay: (block: Block) => boolean
  frequencyBlocks: Block[]
  __state: Map<string, unknown>
}
export type Block = Context['blocks']['0']
export type Log = Context['blocks']['0']['logs']['0']
export type Transaction = Context['blocks']['0']['transactions']['0']
export type Trace = Context['blocks']['0']['traces']['0']

export interface EvmProcessor {
  name: string
  from?: number
  chainId: number
  initialize?: (ctx: Context) => Promise<void> // To only be run once per `sqd process`.
  setup?: (p: ReturnType<typeof createEvmBatchProcessor>, chain: Chain) => void
  process: (ctx: Context) => Promise<void>
}
