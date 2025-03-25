"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.chainConfigs = exports.joinProcessors = exports.defineProcessor = exports.defineSquidProcessor = exports.createEvmBatchProcessor = void 0;
const assert_1 = __importDefault(require("assert"));
const dayjs_1 = __importDefault(require("dayjs"));
const duration_1 = __importDefault(require("dayjs/plugin/duration"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const lodash_1 = require("lodash");
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const evm_processor_1 = require("@subsquid/evm-processor");
const typeorm_store_1 = require("@subsquid/typeorm-store");
const blockFrequencyUpdater_1 = require("./blockFrequencyUpdater");
const calculateBlockRate_1 = require("./calculateBlockRate");
const processing_stats_1 = require("./processing-stats");
require("./polyfills/rpc-issues");
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
            effectiveGasPrice: true,
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
            error: true,
            revertReason: true,
            ...options?.fields?.trace,
        },
    });
    if (process.env.DISABLE_ARCHIVE !== 'true') {
        console.log(`Archive gateway: ${config.gateway}`);
        processor.setGateway(config.gateway);
    }
    else {
        console.log(`Archive disabled`);
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
        setup: (evmBatchProcessor, chain) => {
            processors.forEach(p => p.setup?.(evmBatchProcessor, chain));
        },
        process: async (ctx) => {
            await Promise.all(processors.map(p => p.process(ctx)));
        }
    };
};
exports.joinProcessors = joinProcessors;
let initialized = false;
exports.chainConfigs = {
    [chains_1.mainnet.id]: {
        chain: chains_1.mainnet,
        gateway: 'https://v2.archive.subsquid.io/network/ethereum-mainnet',
        endpoints: (0, lodash_1.compact)([
            process.env[process.env.RPC_ENV ?? 'RPC_ENDPOINT'],
            process.env[process.env.RPC_ENV_BACKUP ?? 'RPC_ETH_HTTP'],
        ]),
    },
    [chains_1.arbitrum.id]: {
        chain: chains_1.arbitrum,
        gateway: 'https://v2.archive.subsquid.io/network/arbitrum-one',
        endpoints: (0, lodash_1.compact)([
            process.env[process.env.RPC_ARBITRUM_ENV ?? 'RPC_ARBITRUM_ENDPOINT'],
            process.env[process.env.RPC_ARBITRUM_ENV_BACKUP ?? 'RPC_ARBITRUM_ONE_HTTP'],
        ]),
    },
    [chains_1.base.id]: {
        chain: chains_1.base,
        gateway: 'https://v2.archive.subsquid.io/network/base-mainnet',
        endpoints: (0, lodash_1.compact)([
            process.env[process.env.RPC_BASE_ENV ?? 'RPC_BASE_ENDPOINT'],
            process.env[process.env.RPC_BASE_ENV_BACKUP ?? 'RPC_BASE_HTTP'],
        ]),
    },
    [chains_1.sonic.id]: {
        chain: chains_1.sonic,
        gateway: 'https://v2.archive.subsquid.io/network/sonic-mainnet',
        endpoints: (0, lodash_1.compact)([
            process.env[process.env.RPC_SONIC_ENV ?? 'RPC_SONIC_ENDPOINT'],
            process.env[process.env.RPC_SONIC_ENV_BACKUP ?? 'RPC_SONIC_MAINNET_HTTP'],
        ]),
    },
    [chains_1.optimism.id]: {
        chain: chains_1.optimism,
        gateway: 'https://v2.archive.subsquid.io/network/optimism-mainnet',
        endpoints: (0, lodash_1.compact)([
            process.env[process.env.RPC_OPTIMISM_ENV ?? 'RPC_OPTIMISM_ENDPOINT'],
            process.env[process.env.RPC_OPTIMISM_ENV_BACKUP ?? 'RPC_OPTIMISM_HTTP'],
        ]),
    },
    [chains_1.bsc.id]: {
        chain: chains_1.bsc,
        gateway: 'https://v2.archive.subsquid.io/network/binance-mainnet',
        endpoints: (0, lodash_1.compact)([
            process.env[process.env.RPC_BSC_ENV ?? 'RPC_BSC_ENDPOINT'],
            process.env[process.env.RPC_BSC_ENV_BACKUP ?? 'RPC_BSC_HTTP'],
        ]),
    },
};
const run = async ({ fromNow, chainId = 1, stateSchema, processors, postProcessors, validators, postValidation }) => {
    if (!fromNow) {
        (0, assert_1.default)(!processors.find((p) => p.from === undefined), 'All processors must have a `from` defined');
    }
    if (process.env.PROCESSOR) {
        processors = processors.filter((p) => p.name?.includes(process.env.PROCESSOR));
    }
    if (process.env.PROCESSOR) {
        postProcessors = postProcessors?.filter((p) => p.name?.includes(process.env.PROCESSOR));
    }
    console.log('Processors:\n  -', processors.map((p) => p.name).join('\n  - '));
    const config = exports.chainConfigs[chainId];
    if (!config)
        throw new Error('No chain configuration found.');
    // console.log('env', JSON.stringify(process.env, null, 2))
    // console.log('config', JSON.stringify(config, null, 2))
    const evmBatchProcessor = (0, exports.createEvmBatchProcessor)(config);
    const client = (0, viem_1.createPublicClient)({ chain: config.chain, transport: (0, viem_1.http)(config.endpoints[0]) });
    const latestBlock = await client.getBlock();
    const database = new typeorm_store_1.TypeormDatabase({ supportHotBlocks: true, stateSchema });
    // In order to resume from the last processed block while having no `from` block declared,
    //   we must pull the state and use that as our `from` block.
    const databaseState = await database.connect();
    const latestHeight = databaseState.height;
    await database.disconnect();
    let from = [...processors, ...(postProcessors ?? [])].reduce((min, p) => (p.from && p.from < min ? p.from : min), fromNow ? latestHeight : Number(latestBlock.number));
    if (from === -1 && fromNow) {
        from = Number(latestBlock.number);
    }
    from = process.env.BLOCK_FROM ? Number(process.env.BLOCK_FROM) : from;
    const to = process.env.BLOCK_TO ? Number(process.env.BLOCK_TO) : undefined;
    evmBatchProcessor.setBlockRange({
        from,
        to,
    });
    processors.forEach((p) => p.setup?.(evmBatchProcessor, config.chain));
    postProcessors?.forEach((p) => p.setup?.(evmBatchProcessor, config.chain));
    const frequencyTracker = (0, blockFrequencyUpdater_1.blockFrequencyTracker)({ from });
    let contextTime = Date.now();
    const averageTimeMap = new Map();
    evmBatchProcessor.run(new typeorm_store_1.TypeormDatabase({
        stateSchema,
        supportHotBlocks: true,
        isolationLevel: 'READ COMMITTED',
    }), async (_ctx) => {
        const ctx = _ctx;
        try {
            ctx.chain = config.chain;
            ctx.__state = new Map();
            if (ctx.blocks.length >= 1) {
                ctx.blockRate = await (0, calculateBlockRate_1.calculateBlockRate)(ctx);
                ctx.log.info(`Block rate: ${ctx.blockRate}`);
            }
            ctx.blocksWithContent = ctx.blocks.filter((b) => b.logs.length > 0 || b.traces.length > 0 || b.transactions.length > 0);
            ctx.frequencyBlocks = ctx.blocks.filter((b) => frequencyTracker(ctx, b));
            ctx.lastBlockPerDay = new Map();
            for (const block of ctx.blocks) {
                ctx.lastBlockPerDay.set(new Date(block.header.timestamp).toISOString().slice(0, 10), block);
            }
            ctx.latestBlockOfDay = (block) => {
                const date = new Date(block.header.timestamp).toISOString().slice(0, 10);
                return ctx.lastBlockPerDay.get(date) === block || ctx.blocks.at(-1) === block;
            };
            let start;
            const time = (name) => () => {
                const timedata = averageTimeMap.get(name) ?? [0, 0];
                timedata[0] += Date.now() - start;
                timedata[1] += 1;
                averageTimeMap.set(name, timedata);
                const message = `${name} ${timedata[1]}x avg ${(timedata[0] / timedata[1]).toFixed(0)}ms`;
                return () => ctx.log.info(message);
            };
            // Initialization Run
            if (!initialized) {
                initialized = true;
                ctx.log.info(`initializing`);
                start = Date.now();
                const times = await Promise.all([
                    ...processors
                        .filter((p) => p.initialize)
                        .map((p, index) => p.initialize(ctx).then(time(p.name ? `initializing ${p.name}` : `initializing processor-${index}`))),
                    ...(postProcessors ?? [])
                        .filter((p) => p.initialize)
                        .map((p, index) => p.initialize(ctx).then(time(p.name ? `initializing ${p.name}` : `initializing postProcessors-${index}`))),
                ]);
                times.forEach((t) => t());
            }
            // Main Processing Run
            start = Date.now();
            const times = await Promise.all(processors.map((p, index) => p.process(ctx).then(time(p.name ?? `processor-${index}`))));
            if (process.env.DEBUG_PERF === 'true') {
                ctx.log.info('===== Processor Times =====');
                times.forEach((t) => t());
            }
            if (postProcessors) {
                // Post Processing Run
                start = Date.now();
                const postTimes = await Promise.all(postProcessors.map((p, index) => p.process(ctx).then(time(p.name ?? `postProcessor-${index}`))));
                if (process.env.DEBUG_PERF === 'true') {
                    ctx.log.info('===== Post Processor Times =====');
                    postTimes.forEach((t) => t());
                }
            }
            if (validators) {
                // Validation Run
                start = Date.now();
                const validatorTimes = await Promise.all(validators.map((p, index) => p.process(ctx).then(time(p.name ?? `validator-${index}`))));
                if (process.env.DEBUG_PERF === 'true') {
                    ctx.log.info('===== Validator Times =====');
                    validatorTimes.forEach((t) => t());
                }
            }
            if (postValidation) {
                await postValidation(ctx);
            }
        }
        finally {
            (0, processing_stats_1.printStats)(ctx);
            if (process.env.DEBUG_PERF === 'true') {
                ctx.log.info(`===== End of Context ===== (${Date.now() - contextTime}ms, ${ctx.blocks.at(-1)?.header.height})`);
            }
            contextTime = Date.now();
        }
    });
};
exports.run = run;
//# sourceMappingURL=processor.js.map