"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDateForTimestamp = exports.getDatesBetween = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const getDatesBetween = (startDate, endDate) => {
    const dates = [];
    let currentDate = dayjs_1.default.utc(startDate);
    const end = dayjs_1.default.utc(endDate);
    while (currentDate.isBefore(end.add(1, 'day'))) {
        dates.push(currentDate.toISOString().slice(0, 10));
        currentDate = currentDate.add(1, 'day');
    }
    return dates;
};
exports.getDatesBetween = getDatesBetween;
const getDateForTimestamp = (timestamp) => {
    return new Date(timestamp).toISOString().slice(0, 10);
};
exports.getDateForTimestamp = getDateForTimestamp;
//# sourceMappingURL=dates.js.map