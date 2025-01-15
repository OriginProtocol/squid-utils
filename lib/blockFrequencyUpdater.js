"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAerodromeImportantBlock = exports.blockFrequencyUpdater = exports.blockFrequencyTracker = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const duration_1 = __importDefault(require("dayjs/plugin/duration"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const chains_1 = require("viem/chains");
dayjs_1.default.extend(duration_1.default);
dayjs_1.default.extend(utc_1.default);
const SECONDS_PER_WEEK = dayjs_1.default.duration({ weeks: 1 }).asSeconds();
const SECONDS_PER_DAY = dayjs_1.default.duration({ days: 1 }).asSeconds();
const SECONDS_PER_HOUR = dayjs_1.default.duration({ hours: 1 }).asSeconds();
const SECONDS_PER_MINUTE = 60;
// It's OK that these are only calculated at launch.
const oneYearAgo = dayjs_1.default.utc().subtract(1, 'year').valueOf();
const oneMonthAgo = dayjs_1.default.utc().subtract(1, 'month').valueOf();
const oneWeekAgo = dayjs_1.default.utc().subtract(1, 'week').valueOf();
const oneDayAgo = dayjs_1.default.utc().subtract(1, 'day').valueOf();
const oneHourAgo = dayjs_1.default.utc().subtract(1, 'hour').valueOf();
const fifteenMinutesAgo = dayjs_1.default.utc().subtract(15, 'minutes').valueOf();
const getFrequency = (blockRate, timestamp) => {
    if (timestamp < oneYearAgo) {
        return (SECONDS_PER_WEEK / blockRate) ^ 0; // Older than one year ago
    }
    else if (timestamp < oneMonthAgo) {
        return (SECONDS_PER_DAY / blockRate) ^ 0; // Older than one month ago
    }
    else if (timestamp < oneWeekAgo) {
        return (SECONDS_PER_DAY / blockRate / 4) ^ 0; // Older than one week ago
    }
    else if (timestamp < oneDayAgo) {
        return ((SECONDS_PER_MINUTE * 30) / blockRate) ^ 0; // Older than one day ago
    }
    else if (timestamp < oneHourAgo) {
        return ((SECONDS_PER_MINUTE * 15) / blockRate) ^ 0; // Older than one hour ago
    }
    else if (timestamp < fifteenMinutesAgo) {
        return ((SECONDS_PER_MINUTE * 5) / blockRate) ^ 0; // Older than 15 minutes ago
    }
    else {
        return (SECONDS_PER_MINUTE / blockRate) ^ 0;
    }
};
const blockFrequencyTracker = (params) => {
    return (ctx, block) => {
        if (block.header.height < params.from)
            return;
        const frequency = getFrequency(ctx.blockRate, block.header.timestamp);
        return (
        // If our chain is Tenderly, we want to process all blocks.
        // The frequency logic gets messed up on Tenderly forks.
        ctx._chain.client.url.includes('tenderly') ||
            // Normal logic down below.
            block.header.height % frequency === 0 ||
            block.header.height % 100000 === 0 || // For validation generation we need something reliable and unchanging.
            (0, exports.isAerodromeImportantBlock)(ctx, block));
    };
};
exports.blockFrequencyTracker = blockFrequencyTracker;
const blockFrequencyUpdater = (params) => {
    const parallelLimit = 10;
    const tracker = (0, exports.blockFrequencyTracker)(params);
    return async (ctx, fn) => {
        if (!ctx.blocks.length)
            return;
        if (ctx.blocks[ctx.blocks.length - 1].header.height < params.from) {
            // No applicable blocks in current context.
            return;
        }
        const blocksToProcess = ctx.blocks.filter((block) => tracker(ctx, block));
        if (params.parallelProcessing) {
            // Process blocks in parallel with a limit
            for (let i = 0; i < blocksToProcess.length; i += parallelLimit) {
                const chunk = blocksToProcess.slice(i, i + parallelLimit);
                await Promise.all(chunk.map((block) => fn(ctx, block)));
            }
        }
        else {
            // Process blocks sequentially
            for (const block of blocksToProcess) {
                await fn(ctx, block);
            }
        }
    };
};
exports.blockFrequencyUpdater = blockFrequencyUpdater;
// This came around so we can have good historical snapshots of data during Aerodrome epoch flips.
const isAerodromeImportantBlock = (ctx, block) => {
    if (ctx.chain.id !== chains_1.base.id)
        return false;
    if (block.header.height < 17819702)
        return false;
    const lastBlockWeek = Math.floor((block.header.timestamp / 1000 - ctx.blockRate) / SECONDS_PER_WEEK);
    const blockWeek = Math.floor(block.header.timestamp / 1000 / SECONDS_PER_WEEK);
    if (blockWeek !== lastBlockWeek)
        return true;
    const nextBlockWeek = Math.floor((block.header.timestamp / 1000 + ctx.blockRate) / SECONDS_PER_WEEK);
    if (blockWeek !== nextBlockWeek)
        return true;
    const secondOfWeek = Math.floor(block.header.timestamp / 1000) % SECONDS_PER_WEEK;
    const lastBlockHourOfWeek = Math.floor((secondOfWeek - ctx.blockRate) / SECONDS_PER_HOUR);
    const hourOfWeek = Math.floor(secondOfWeek / SECONDS_PER_HOUR);
    return lastBlockHourOfWeek === 0 && hourOfWeek === 1;
};
exports.isAerodromeImportantBlock = isAerodromeImportantBlock;
//# sourceMappingURL=blockFrequencyUpdater.js.map