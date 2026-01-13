import {Request, Response, NextFunction} from 'express';
import { redisCache } from '../services/redisCache';

const TIER_LIMITS = {
  enterprise: 1000, // High limit
  hobby: 100,       // Medium limit
  free: 5           // [Q10] New Free tier limit
};

const WINDOW_IN_SECONDS = 60;
export const tierRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'anonymous';
    const userTier = (req as any).user?.tier || 'free';
    const limit = TIER_LIMITS[userTier as keyof typeof TIER_LIMITS];
    
    const identifier = (req as any).user?.id || ip;
    const key = `rate-limit:${userTier}:${identifier}`;
    try{
        const currentRequests = await redisCache.client.incr(key);
        if (currentRequests === 1){
            await redisCache.client.expire(key, WINDOW_IN_SECONDS);
        }
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', limit - currentRequests);
        res.setHeader('X-Tier', userTier);
        if (currentRequests > limit){
            return res.status(429).json({ error: 'Rate limit exceeded', message: `You have exceeded the limit of ${limit} requests per minute.` });
        }
        next();
    }catch(err){
        console.error('Rate limit middleware error', err);
        next();
    }
    
}

