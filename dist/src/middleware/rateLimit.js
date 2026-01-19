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
exports.createRateLimiter = void 0;
const redisCache_1 = require("../services/redisCache");
const createRateLimiter = (limit, windowInSeconds) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const ip = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
        const key = `rate-limit:${req.path}:${ip}`;
        try {
            const currentRequests = yield redisCache_1.redisCache.client.incr(key);
            if (currentRequests === 1) {
                yield redisCache_1.redisCache.client.expire(key, windowInSeconds);
            }
            res.setHeader('X-RateLimit-Limit', limit);
            res.setHeader('X-RateLimit-Remaining', limit - currentRequests);
            if (currentRequests > limit) {
                return res.status(429).json({ error: 'Rate limit exceeded',
                    message: `You have exceeded the limit of ${limit} requests per minute.`
                });
            }
            // console.log('Headers before next:',ip, res.getHeaders())
            next();
        }
        catch (err) {
            console.error('Rate limit middleware error', err);
            next();
        }
    });
};
exports.createRateLimiter = createRateLimiter;
