import { Chain } from 'viem';
import { Context, Processor } from './types';
export interface SquidHandlerOptions {
    chain: Chain;
    from: number;
    processors: Processor[];
    postProcessors?: Processor[];
    validators?: Pick<Processor, 'process' | 'name'>[];
    postValidation?: (ctx: Context) => Promise<void>;
}
/**
 * The batch handler shared by both SDK generations.
 *
 * Everything generation-specific — `_chain`, `log`, block augmentation — is
 * attached by the caller before the returned function runs, so this stays the
 * single definition of what a squid context carries and in what order
 * processors run.
 */
export declare const createSquidHandler: ({ chain, from, processors, postProcessors, validators, postValidation, }: SquidHandlerOptions) => (ctx: Context) => Promise<void>;
