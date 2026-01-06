import { Request, Response, NextFunction } from 'express';
import {logger} from './logger';

console.log('logger----------------',logger);

export const timeMiddleware = (name: string, middleware:any) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const start = process.hrtime();

        const interceptedNext = () => {
            const diff = process.hrtime(start);
            const duration = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
            logger.info({
                type: 'middleware_perf',
                middleware: name,
                duration: `${duration}ms`,
                requestId: req.headers['x-request-id'] || 'N/A'
            });
            
            next();
        }   
        return middleware(req, res, interceptedNext);
    }
}