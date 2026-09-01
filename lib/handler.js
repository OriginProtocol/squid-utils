"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSquidHandler = void 0;
const blockFrequencyUpdater_1 = require("./blockFrequencyUpdater");
const calculateBlockRate_1 = require("./calculateBlockRate");
const processing_stats_1 = require("./processing-stats");
/**
 * The batch handler shared by both SDK generations.
 *
 * Everything generation-specific — `_chain`, `log`, block augmentation — is
 * attached by the caller before the returned function runs, so this stays the
 * single definition of what a squid context carries and in what order
 * processors run.
 */
const createSquidHandler = ({ chain, from, processors, postProcessors, validators, postValidation, }) => {
    const frequencyTracker = (0, blockFrequencyUpdater_1.blockFrequencyTracker)({ from });
    const averageTimeMap = new Map();
    let contextTime = Date.now();
    let initialized = false;
    return async (ctx) => {
        try {
            ctx.chain = chain;
            ctx.__state = new Map();
            if (ctx.blocks.length >= 1) {
                ctx.blockRate = await (0, calculateBlockRate_1.calculateBlockRate)(ctx);
            }
            ctx.blocksWithContent = ctx.blocks.filter((b) => b.logs.length > 0 || b.traces.length > 0 || b.transactions.length > 0);
            ctx.frequencyBlocks = ctx.blocks.filter((b) => frequencyTracker(ctx, b));
            ctx.lastBlockPerDay = new Map();
            for (const block of ctx.blocks) {
                if (!block.header.timestamp)
                    continue;
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
    };
};
exports.createSquidHandler = createSquidHandler;
//# sourceMappingURL=handler.js.map