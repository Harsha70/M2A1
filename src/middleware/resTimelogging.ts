import { Request, Response, NextFunction } from 'express';

export const responseTimeNative = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startHrTime = process.hrtime();

  const originalWriteHead = res.writeHead;

  res.writeHead = function (
    statusCode: number,
    statusMessage?: string | any,
    headers?: any
  ): Response {
    const diff = process.hrtime(startHrTime);
    const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);

    res.setHeader('X-Response-Time', `${timeInMs}ms`);
    // console.log('statusCode, statusMessage, headers',statusCode, statusMessage, headers);

    return originalWriteHead.apply(this, arguments as any);
  };

  next();
};

