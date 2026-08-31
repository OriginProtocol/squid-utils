import { FieldSelection as GatewayFieldSelection } from '@subsquid/evm-processor';
import { EVMDataSource, FieldSelection as PortalFieldSelection } from '@subsquid/evm-stream';
import { PortalClientOptions } from '@subsquid/portal-client';
import { Range } from '@subsquid/util-internal-range';
import { PORTAL_DEFAULT_FIELDS, PortalFields } from './fields';
import { ChainConfig, SquidProcessor } from './processor';
import './polyfills/rpc-issues';
import { LogRequest, ProcessorRegistrar, StateDiffRequest, TraceRequest, TransactionRequest } from './types';
/**
 * A `DataSourceBuilder` wearing the gateway-era registration API.
 *
 * Downstream `setup(p)` bodies register flat request objects — what
 * `logFilter().value` and friends produce. The Portal SDK wants
 * `{where, include}`. Translating here is what keeps the ~124 registrations
 * across origin-squid / ops-squid / origin-squid-notifications at zero diff.
 */
export declare class PortalDataSourceBuilder implements ProcessorRegistrar {
    private portal;
    private fields;
    private registrations;
    private blockRange?;
    constructor(portal: PortalClientOptions, fields: PortalFieldSelection);
    includeAllBlocks(range?: Range): this;
    addLog(options: LogRequest & {
        range?: Range;
    }): this;
    addTransaction(options: TransactionRequest & {
        range?: Range;
    }): this;
    addTrace(options: TraceRequest & {
        range?: Range;
    }): this;
    addStateDiff(options: StateDiffRequest & {
        range?: Range;
    }): this;
    setBlockRange(range?: Range): this;
    build(): EVMDataSource<PortalFields>;
}
/**
 * Portal data source for a chain. `SQD_API_KEY` rides along as `x-api-key`
 * natively, so this path needs none of `polyfills/portal-api-key.ts` — that
 * patch exists only because the gateway path's SDK hardcodes its headers.
 */
export declare const createPortalDataSource: (config: ChainConfig, options?: {
    fields?: GatewayFieldSelection;
}) => PortalDataSourceBuilder;
/**
 * Run a squid on the Portal SDK — `@subsquid/evm-stream` +
 * `@subsquid/batch-processor`, consuming the portal's real-time `/stream`
 * rather than polling an RPC endpoint for the chain head.
 *
 * Same `SquidProcessor` shape as `run()`. Sonic has no real-time portal
 * dataset and stays on `run()`.
 */
export declare const runPortal: (squidProcessor: SquidProcessor) => Promise<void>;
export { PORTAL_DEFAULT_FIELDS };
