"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.selectProcessors = exports.resolveBlockRange = exports.chainConfigs = exports.joinProcessors = exports.defineProcessor = exports.defineSquidProcessor = exports.createEvmBatchProcessor = void 0;
const assert_1 = __importDefault(require("assert"));
const dayjs_1 = __importDefault(require("dayjs"));
const duration_1 = __importDefault(require("dayjs/plugin/duration"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const lodash_1 = require("lodash");
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const evm_processor_1 = require("@subsquid/evm-processor");
const fields_1 = require("./fields");
const handler_1 = require("./handler");
require("./polyfills/rpc-issues");
const portal_api_key_1 = require("./polyfills/portal-api-key");
// Raises `work_mem` for the transaction `repairOrphans` runs in, keeping its
// `NOT IN` sweeps on the hashed-SubPlan side of the planner's cliff.
const repair_orphans_work_mem_1 = require("./polyfills/repair-orphans-work-mem");
dayjs_1.default.extend(duration_1.default);
dayjs_1.default.extend(utc_1.default);
const createEvmBatchProcessor = (config, options) => {
    const url = config.endpoints[0] || 'http://localhost:8545';
    console.log('rpc url', url);
    const processor = new evm_processor_1.EvmBatchProcessor()
        .setRpcEndpoint({
        url,
        maxBatchCallSize: url.includes('alchemy.com') ? 1 : 100,
        // rateLimit: url.includes('sqd_rpc') ? 100 : undefined,
    })
        .setRpcDataIngestionSettings({
        disabled: process.env.ARCHIVE_ONLY === 'true',
        headPollInterval: 5000,
    })
        .setFinalityConfirmation(50)
        .setFields(options?.fields ? options?.fields : fields_1.DEFAULT_FIELDS);
    if (process.env.DISABLE_PORTAL !== 'true') {
        console.log(`Portal url: ${config.portal}`);
        (0, portal_api_key_1.registerPortalUrl)(config.portal);
        processor.setPortal(config.portal);
    }
    else if (process.env.DISABLE_ARCHIVE !== 'true') {
        console.log(`Gateway url: ${config.gateway}`);
        processor.setGateway(config.gateway);
    }
    else {
        console.log(`Portal disabled`);
    }
    return processor;
};
exports.createEvmBatchProcessor = createEvmBatchProcessor;
const defineSquidProcessor = (p) => p;
exports.defineSquidProcessor = defineSquidProcessor;
const defineProcessor = (p) => p;
exports.defineProcessor = defineProcessor;
const joinProcessors = (name, processors) => {
    return {
        name,
        from: processors.reduce((min, p) => (p.from != null && (min == null || p.from < min)) ? p.from : min, undefined),
        initialize: async (ctx) => {
            await Promise.all(processors.map(p => p.initialize?.(ctx)));
        },
        setup: (registrar, chain) => {
            processors.forEach(p => p.setup?.(registrar, chain));
        },
        process: async (ctx) => {
            await Promise.all(processors.map(p => p.process(ctx)));
        }
    };
};
exports.joinProcessors = joinProcessors;
// The shared portal requires `SQD_API_KEY`; without a key we fall back to the public one.
const portalUrl = (dataset) => process.env.SQD_API_KEY
    ? `https://shared.portal.sqd.dev/datasets/${dataset}`
    : `https://portal.sqd.dev/datasets/${dataset}`;
exports.chainConfigs = {
    [chains_1.mainnet.id]: {
        chain: chains_1.mainnet,
        gateway: 'https://v2.archive.subsquid.io/network/ethereum-mainnet',
        portal: process.env.PORTAL_URL_ETHEREUM ?? portalUrl('ethereum-mainnet'),
        endpoints: (0, lodash_1.compact)([
            process.env[process.env.RPC_ENV ?? 'RPC_ENDPOINT'],
            process.env[process.env.RPC_ENV_BACKUP ?? 'RPC_ETH_HTTP'],
        ]),
    },
    [chains_1.arbitrum.id]: {
        chain: chains_1.arbitrum,
        gateway: 'https://v2.archive.subsquid.io/network/arbitrum-one',
        portal: process.env.PORTAL_URL_ARBITRUM ?? portalUrl('arbitrum-one'),
        endpoints: (0, lodash_1.compact)([
            process.env[process.env.RPC_ARBITRUM_ENV ?? 'RPC_ARBITRUM_ENDPOINT'],
            process.env[process.env.RPC_ARBITRUM_ENV_BACKUP ?? 'RPC_ARBITRUM_ONE_HTTP'],
        ]),
    },
    [chains_1.base.id]: {
        chain: chains_1.base,
        gateway: 'https://v2.archive.subsquid.io/network/base-mainnet',
        portal: process.env.PORTAL_URL_BASE ?? portalUrl('base-mainnet'),
        endpoints: (0, lodash_1.compact)([
            process.env[process.env.RPC_BASE_ENV ?? 'RPC_BASE_ENDPOINT'],
            process.env[process.env.RPC_BASE_ENV_BACKUP ?? 'RPC_BASE_HTTP'],
        ]),
    },
    [chains_1.sonic.id]: {
        chain: chains_1.sonic,
        gateway: 'https://v2.archive.subsquid.io/network/sonic-mainnet',
        portal: process.env.PORTAL_URL_SONIC ?? portalUrl('sonic-mainnet'),
        endpoints: (0, lodash_1.compact)([
            process.env[process.env.RPC_SONIC_ENV ?? 'RPC_SONIC_ENDPOINT'],
            process.env[process.env.RPC_SONIC_ENV_BACKUP ?? 'RPC_SONIC_MAINNET_HTTP'],
        ]),
    },
    [chains_1.optimism.id]: {
        chain: chains_1.optimism,
        gateway: 'https://v2.archive.subsquid.io/network/optimism-mainnet',
        portal: process.env.PORTAL_URL_OPTIMISM ?? portalUrl('optimism-mainnet'),
        endpoints: (0, lodash_1.compact)([
            process.env[process.env.RPC_OPTIMISM_ENV ?? 'RPC_OPTIMISM_ENDPOINT'],
            process.env[process.env.RPC_OPTIMISM_ENV_BACKUP ?? 'RPC_OPTIMISM_HTTP'],
        ]),
    },
    [chains_1.bsc.id]: {
        chain: chains_1.bsc,
        gateway: 'https://v2.archive.subsquid.io/network/binance-mainnet',
        portal: process.env.PORTAL_URL_BSC ?? portalUrl('binance-mainnet'),
        endpoints: (0, lodash_1.compact)([
            process.env[process.env.RPC_BSC_ENV ?? 'RPC_BSC_ENDPOINT'],
            process.env[process.env.RPC_BSC_ENV_BACKUP ?? 'RPC_BSC_HTTP'],
        ]),
    },
    [chains_1.hyperEvm.id]: {
        chain: chains_1.hyperEvm,
        gateway: 'https://v2.archive.subsquid.io/network/hyperliquid-mainnet',
        portal: process.env.PORTAL_URL_HYPEREVM ?? portalUrl('hyperliquid-mainnet'),
        endpoints: (0, lodash_1.compact)([
            process.env[process.env.RPC_HYPEREVM_ENV ?? 'RPC_HYPEREVM_ENDPOINT'],
            process.env[process.env.RPC_HYPEREVM_ENV_BACKUP ?? 'RPC_HYPEREVM_HTTP'],
        ]),
    },
};
/**
 * Resolve the block to start from, honouring `BLOCK_FROM`/`BLOCK_TO`,
 * `fromNow`, and the height already persisted in `stateSchema`.
 * Shared by both SDK generations.
 */
const resolveBlockRange = async ({ config, stateSchema, fromNow, processors, }) => {
    const client = (0, viem_1.createPublicClient)({ chain: config.chain, transport: (0, viem_1.http)(config.endpoints[0]) });
    const latestBlock = await client.getBlock();
    // In order to resume from the last processed block while having no `from` block declared,
    //   we must pull the state and use that as our `from` block.
    const database = (0, repair_orphans_work_mem_1.createTypeormDatabase)({ supportHotBlocks: true, stateSchema });
    const databaseState = await database.connect();
    const latestHeight = databaseState.height;
    await database.disconnect();
    let from = processors.reduce((min, p) => (p.from && p.from < min ? p.from : min), fromNow ? latestHeight : Number(latestBlock.number));
    if (from === -1 && fromNow) {
        from = Number(latestBlock.number);
    }
    return {
        from: process.env.BLOCK_FROM ? Number(process.env.BLOCK_FROM) : from,
        to: process.env.BLOCK_TO ? Number(process.env.BLOCK_TO) : undefined,
    };
};
exports.resolveBlockRange = resolveBlockRange;
/**
 * Select the processors this container should run, honouring `PROCESSOR`.
 * Shared by both SDK generations.
 */
const selectProcessors = ({ fromNow, processors, postProcessors }) => {
    if (!fromNow) {
        (0, assert_1.default)(!processors.find((p) => p.from === undefined), 'All processors must have a `from` defined');
    }
    if (process.env.PROCESSOR) {
        processors = processors.filter((p) => p.name?.includes(process.env.PROCESSOR));
        postProcessors = postProcessors?.filter((p) => p.name?.includes(process.env.PROCESSOR));
    }
    console.log('Processors:\n  -', processors.map((p) => p.name).join('\n  - '));
    return { processors, postProcessors };
};
exports.selectProcessors = selectProcessors;
const run = async (squidProcessor) => {
    const { fromNow, chainId = 1, stateSchema, validators, postValidation, fields } = squidProcessor;
    const { processors, postProcessors } = (0, exports.selectProcessors)(squidProcessor);
    const config = exports.chainConfigs[chainId];
    if (!config)
        throw new Error('No chain configuration found.');
    const evmBatchProcessor = (0, exports.createEvmBatchProcessor)(config, { fields });
    const { from, to } = await (0, exports.resolveBlockRange)({
        config,
        stateSchema,
        fromNow,
        processors: [...processors, ...(postProcessors ?? [])],
    });
    evmBatchProcessor.setBlockRange({ from, to });
    processors.forEach((p) => p.setup?.(evmBatchProcessor, config.chain));
    postProcessors?.forEach((p) => p.setup?.(evmBatchProcessor, config.chain));
    const evmBatchProcessorWithRequests = evmBatchProcessor;
    evmBatchProcessorWithRequests.requests = (0, lodash_1.uniqWith)(evmBatchProcessorWithRequests.requests, lodash_1.isEqual);
    const handler = (0, handler_1.createSquidHandler)({
        chain: config.chain,
        from,
        processors,
        postProcessors,
        validators,
        postValidation,
    });
    evmBatchProcessor.run((0, repair_orphans_work_mem_1.createTypeormDatabase)({
        stateSchema,
        supportHotBlocks: true,
        isolationLevel: 'READ COMMITTED',
    }), 
    // The gateway-era context carries the same decorations under different
    // generic parameters; `createSquidHandler` only reads what both provide.
    async (ctx) => handler(ctx));
};
exports.run = run;
//# sourceMappingURL=processor.js.map