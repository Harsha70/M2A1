import { Request, Response, NextFunction } from "express";
import { redisCache } from "../services/redisCache";

export const createRateLimiter = (limit: number, windowInSeconds: number) =>{
    return async (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
        const key = `rate-limit:${req.path}:${ip}`;

        try{
            const currentRequests = await redisCache.client.incr(key);
            if (currentRequests === 1){
                await redisCache.client.expire(key, windowInSeconds);
            }
            res.setHeader('X-RateLimit-Limit', limit);
            res.setHeader('X-RateLimit-Remaining', limit - currentRequests);

            if (currentRequests > limit) {
                return res.status(429).json({ error: 'Rate limit exceeded',
                    message: `You have exceeded the limit of ${limit} requests per minute.`
                });
            }
            console.log('Headers before next:',ip, res.getHeaders())
            next();
        }catch(err){
            console.error('Rate limit middleware error', err);
            next();
        }
    }
}
