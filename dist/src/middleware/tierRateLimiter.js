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
exports.tierRateLimiter = void 0;
const redisCache_1 = require("../services/redisCache");
const TIER_LIMITS = {
    enterprise: 1000, // High limit
    hobby: 100, // Medium limit
    free: 5 // [Q10] New Free tier limit
};
const WINDOW_IN_SECONDS = 60;
const tierRateLimiter = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const ip = req.ip || 'anonymous';
    const userTier = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tier) || 'free';
    const limit = TIER_LIMITS[userTier];
    const identifier = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) || ip;
    const key = `rate-limit:${userTier}:${identifier}`;
    try {
        const currentRequests = yield redisCache_1.redisCache.client.incr(key);
        if (currentRequests === 1) {
            yield redisCache_1.redisCache.client.expire(key, WINDOW_IN_SECONDS);
        }
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', limit - currentRequests);
        res.setHeader('X-Tier', userTier);
        if (currentRequests > limit) {
            return res.status(429).json({ error: 'Rate limit exceeded', message: `You have exceeded the limit of ${limit} requests per minute.` });
        }
        next();
    }
    catch (err) {
        console.error('Rate limit middleware error', err);
        next();
    }
});
exports.tierRateLimiter = tierRateLimiter;
