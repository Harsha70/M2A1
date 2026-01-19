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
exports.tokenBucketLimiter = void 0;
const redisCache_1 = require("../services/redisCache");
const tokenBucketLimiter = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const key = `tokens:${req.ip}`;
    const limit = 10;
    const refillRate = 1;
    const data = yield redisCache_1.redisCache.client.hGetAll(key);
    let tokens = data.tokens ? parseInt(data.tokens) : limit;
    let lastRefill = data.lastRefill ? parseInt(data.lastRefill) : Date.now();
    const now = Date.now();
    const gained = Math.floor((now - lastRefill) / 1000) * refillRate;
    console.log(gained);
    tokens = Math.min(limit, tokens + gained);
    if (tokens > 0) {
        yield redisCache_1.redisCache.client.hSet(key, { tokens: tokens - 1, lastRefill: now });
        yield redisCache_1.redisCache.client.expire(key, Math.ceil(limit / refillRate) * 2);
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', tokens);
        next();
    }
    else {
        res.status(429).json({ error: "Rate limit exceeded" });
    }
});
exports.tokenBucketLimiter = tokenBucketLimiter;
