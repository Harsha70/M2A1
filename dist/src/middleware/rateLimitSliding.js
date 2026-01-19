"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.slidingWindowLimiter = void 0;
const redisCache_1 = require("../services/redisCache");
const slidingWindowLimiter = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const key = `sliding:${req.ip}`;
    const now = Date.now();
    const windowMs = 60000;
    const limit = 5;
    yield redisCache_1.redisCache.client.zRemRangeByScore(key, 0, now - windowMs);
    const requestCount = yield redisCache_1.redisCache.client.zCard(key);
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', requestCount);
    if (requestCount >= limit) {
        return res.status(429).json({ error: "Sliding window limit exceeded", remaining: limit - requestCount });
    }
    yield redisCache_1.redisCache.client.zAdd(key, { score: now, value: now.toString() });
    yield redisCache_1.redisCache.client.expire(key, 60);
    next();
});
exports.slidingWindowLimiter = slidingWindowLimiter;
