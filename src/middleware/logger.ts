import winston from 'winston';
import Transport from 'winston-transport';
import 'winston-daily-rotate-file';
import { NextFunction, Request, Response } from 'express';

const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

const transport = new winston.transports.DailyRotateFile({
    filename: 'logs/shortener-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '10m',
    maxFiles: '14d'
});

export const logger = winston.createLogger({
    format: logFormat,
    transports:[transport, new winston.transports.Console()
  ]
})

const logMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const duration = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
    const payload = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`
    }
    if (payload.statusCode >= 500) {
      logger.error(`HTTP 500: ${payload.method} ${payload.url}`, { extra: payload });
    } else if (payload.statusCode >= 400) {
      console.log(payload);
      logger.warn(`HTTP ${payload.statusCode}: ${payload.method} ${payload.url}`, { extra: payload });
    } else {
      logger.info(`HTTP ${payload.statusCode}: ${payload.method} ${payload.url}`, { extra: payload });
    }
    
  });

  next();
}

export default logMiddleware;
