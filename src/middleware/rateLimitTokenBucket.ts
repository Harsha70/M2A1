import { redisCache } from "../services/redisCache";
import { Request, Response, NextFunction } from "express";

export const tokenBucketLimiter = async (req: Request, res: Response, next: NextFunction) => {
    const key = `tokens:${req.ip}`;
    const limit = 10;
    const refillRate = 1;

    const data = await redisCache.client.hGetAll(key);
    let tokens = data.tokens ? parseInt(data.tokens) : limit;
    let lastRefill = data.lastRefill ? parseInt(data.lastRefill) : Date.now();

    const now = Date.now();
    const gained = Math.floor((now - lastRefill) / 1000) * refillRate;
    console.log(gained)
    tokens = Math.min(limit, tokens + gained);
    
    if (tokens > 0) {
        await redisCache.client.hSet(key, { tokens: tokens - 1, lastRefill: now });
        await redisCache.client.expire(key, Math.ceil(limit / refillRate) * 2);
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining',tokens);
        next();
    } else {
        res.status(429).json({ error: "Rate limit exceeded" });
    }
};