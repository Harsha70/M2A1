import { Request, Response, NextFunction } from "express";
import { redisCache } from "../services/redisCache";

export const slidingWindowLimiter = async (req: Request, res: Response, next: NextFunction) => {
    const key = `sliding:${req.ip}`;
    const now = Date.now();
    const windowMs = 60000;
    const limit = 5;

    await redisCache.client.zRemRangeByScore(key, 0, now - windowMs);

    const requestCount = await redisCache.client.zCard(key);
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining',requestCount);

    if (requestCount >= limit) {
        return res.status(429).json({ error: "Sliding window limit exceeded", remaining: limit - requestCount });
    }

    await redisCache.client.zAdd(key, { score: now, value: now.toString() });
    await redisCache.client.expire(key, 60);
    next();
};