"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.chainConfigs = exports.defineProcessor = exports.defineSquidProcessor = exports.createEvmBatchProcessor = void 0;
const assert_1 = __importDefault(require("assert"));
const dayjs_1 = __importDefault(require("dayjs"));
const duration_1 = __importDefault(require("dayjs/plugin/duration"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const lodash_1 = require("lodash");
const chains_1 = require("viem/chains");
const archive_registry_1 = require("@subsquid/archive-registry");
const evm_processor_1 = require("@subsquid/evm-processor");
const typeorm_store_1 = require("@subsquid/typeorm-store");
const blockFrequencyUpdater_1 = require("./blockFrequencyUpdater");
const calculateBlockRate_1 = require("./calculateBlockRate");
const processing_stats_1 = require("./processing-stats");
require("./polyfills/rpc-issues");
dayjs_1.default.extend(duration_1.default);
dayjs_1.default.extend(utc_1.default);
const createEvmBatchProcessor = (config) => {
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
        transaction: {
            from: true,
            to: true,
            hash: true,
            gasUsed: true,
            effectiveGasPrice: true,
            // gas: true,
            // gasPrice: true,
            // value: true,
            // sighash: true,
            input: true,
            status: true,
        },
        log: {
            transactionHash: true,
            topics: true,
            data: true,
        },
        trace: {
            callFrom: true,
            callTo: true,
            callSighash: true,
            callValue: true,
            callInput: true,
            createResultAddress: true,
        },
    });
    if (process.env.DISABLE_ARCHIVE !== 'true') {
        console.log(`Archive: ${config.archive}`);
        processor.setGateway((0, archive_registry_1.lookupArchive)(config.archive));
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
let initialized = false;
exports.chainConfigs = {
    [chains_1.mainnet.id]: {
        chain: chains_1.mainnet,
        archive: 'eth-mainnet',
        endpoints: (0, lodash_1.compact)([
            process.env[process.env.RPC_ENV ?? 'RPC_ENDPOINT'],
            process.env[process.env.RPC_ENV_BACKUP ?? 'RPC_ETH_HTTP'],
        ]),
    },
    [chains_1.arbitrum.id]: {
        chain: chains_1.arbitrum,
        archive: 'arbitrum',
        endpoints: (0, lodash_1.compact)([
            process.env[process.env.RPC_ARBITRUM_ENV ?? 'RPC_ARBITRUM_ENDPOINT'],
            process.env[process.env.RPC_ARBITRUM_ENV_BACKUP ?? 'RPC_ARBITRUM_ONE_HTTP'],
        ]),
    },
    [chains_1.base.id]: {
        chain: chains_1.base,
        archive: 'base-mainnet',
        endpoints: (0, lodash_1.compact)([
            process.env[process.env.RPC_BASE_ENV ?? 'RPC_BASE_ENDPOINT'],
            process.env[process.env.RPC_BASE_ENV_BACKUP ?? 'RPC_BASE_HTTP'],
        ]),
    },
};
const run = ({ chainId = 1, stateSchema, processors, postProcessors, validators }) => {
    (0, assert_1.default)(!processors.find((p) => p.from === undefined), 'All processors must have a `from` defined');
    if (process.env.PROCESSOR) {
        processors = processors.filter((p) => p.name?.includes(process.env.PROCESSOR));
    }
    if (process.env.PROCESSOR) {
        postProcessors = postProcessors?.filter((p) => p.name?.includes(process.env.PROCESSOR));
    }
    console.log('Processors:\n  - ', processors.map((p) => p.name).join('\n  - '));
    const config = exports.chainConfigs[chainId];
    if (!config)
        throw new Error('No chain configuration found.');
    // console.log('env', JSON.stringify(process.env, null, 2))
    // console.log('config', JSON.stringify(config, null, 2))
    const evmBatchProcessor = (0, exports.createEvmBatchProcessor)(config);
    const from = process.env.BLOCK_FROM
        ? Number(process.env.BLOCK_FROM)
        : Math.min(...processors.map((p) => p.from).filter((x) => x), ...(postProcessors ?? []).map((p) => p.from).filter((x) => x));
    const to = process.env.BLOCK_TO ? Number(process.env.BLOCK_TO) : undefined;
    evmBatchProcessor.setBlockRange({
        from,
        to,
    });
    processors.forEach((p) => p.setup?.(evmBatchProcessor, config.chain));
    postProcessors?.forEach((p) => p.setup?.(evmBatchProcessor, config.chain));
    const frequencyTracker = (0, blockFrequencyUpdater_1.blockFrequencyTracker)({ from });
    let contextTime = Date.now();
    evmBatchProcessor.run(new typeorm_store_1.TypeormDatabase({
        stateSchema,
        supportHotBlocks: true,
        isolationLevel: 'READ COMMITTED',
    }), async (_ctx) => {
        const ctx = _ctx;
        if (!ctx.isHead && Date.now() - contextTime > 5000) {
            ctx.log.info(`===== !! Slow Context !! ===== (${Date.now() - contextTime}ms)`);
        }
        try {
            ctx.chain = config.chain;
            ctx.__state = new Map();
            if (ctx.blocks.length >= 1) {
                ctx.blockRate = await (0, calculateBlockRate_1.calculateBlockRate)(ctx);
            }
            ctx.blocksWithContent = ctx.blocks.filter((b) => b.logs.length > 0 || b.traces.length > 0 || b.transactions.length > 0);
            ctx.frequencyBlocks = ctx.blocks.filter((b) => frequencyTracker(ctx, b));
            let start;
            const time = (name) => () => {
                const message = `${name} ${Date.now() - start}ms`;
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