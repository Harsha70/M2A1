import "./instrument";
import express, { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import prisma from './db';

import logMiddleware from './middleware/logger';
import { authenticate } from './middleware/authentication';
import { tierCheck } from './middleware/tierCheck';
import { responseTimeNative } from './middleware/resTimelogging';
import { blacklistMiddleware } from './middleware/blacklistMiddleware';
import { timeMiddleware } from './middleware/timeMiddlewares';
// import { cacheService } from "./services/cache";
import { redisCache } from "./services/redisCache";
import { createRateLimiter } from "./middleware/rateLimit";
import { tierRateLimiter } from "./middleware/tierRateLimiter";
import { slidingWindowLimiter } from "./middleware/rateLimitSliding";
import {tokenBucketLimiter} from "./middleware/rateLimitTokenBucket";

export const app = express();

app.use(express.json());

app.use(timeMiddleware('ResponseTime', responseTimeNative));
app.use(timeMiddleware('Blacklist', blacklistMiddleware));
app.use(timeMiddleware('Logger', logMiddleware));

// app.use(tokenBucketLimiter);

app.get('/health', 
  // slidingWindowLimiter,
  tokenBucketLimiter,
  async (req, res)=>{
  const healthStatus = {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    message: "OK",
    checks: {
     server: "UP",
     database: "DOWN" 
    }
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    healthStatus.checks.database = "UP";
  } catch (error) {
    healthStatus.message = "ERROR";
    healthStatus.checks.database = "DOWN";
    res.status(503).json(healthStatus);
  }
  res.status(200).json(healthStatus);
});

app.get('/benchmark', async (req, res)=>{
  const testCode = 'perf_test_code';
  const iterations = 100;
  await prisma.url.upsert({
    where: { shortCode: testCode },
    update: {},
    create: { shortCode: testCode, longUrl: "https://performance-test.com", ownerId: 11 }
  });

  // cacheService.clear();
  redisCache.delete(testCode);
  const startNoCache = performance.now();
  for(let i=0; i<iterations; i++){
    await prisma.url.findUnique({ where: { shortCode: testCode } });
  }
  const endNoCache = performance.now();
  const noCacheDuration = endNoCache - startNoCache;

  // cacheService.clear();
  redisCache.delete(testCode);
  let hits = 0
  let misses = 0
  const startWithCache = performance.now();
  for(let i=0; i<iterations; i++){
    // const cached = cacheService.get(testCode);
    const cached = await redisCache.get(testCode);
    if(cached){
      hits++;
    }else{
      misses++;
      const entry = await prisma.url.findUnique({ where: { shortCode: testCode } });
      // cacheService.set(testCode, entry);
      await redisCache.set(testCode, entry);
    }
  }
  const endCache = performance.now();
  const cacheDuration = endCache - startWithCache;
  const improveFactor = (noCacheDuration / cacheDuration).toFixed(2);

  res.json({
    iterations,
    results:{
      noCache:{
        totalTime: `${noCacheDuration} ms`,
        avgTime: `${noCacheDuration / iterations} ms`,
      },
      withCache:{
        totalTime: `${cacheDuration} ms`,
        avgTime: `${cacheDuration / iterations} ms`,
        hitRatio: `${hits / iterations * 100}%`,
        missRatio: `${misses / iterations * 100}%`,
        hits,
        misses,
      }
    },
    verdict: `Cache improved performance by ${improveFactor}x`
  })
})

app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("Sentry Test Error!");
});
// old shorten
/*
app.post('/shorten', async (req: Request, res: Response): Promise<any> => {
  const { longUrl } = req.body;

  if (!longUrl || longUrl.trim() === "") {
    return res.status(400).json({ 
      error: "URL is required and cannot be empty" 
    });
  }

//   const existing = await prisma.url.findUnique({ where: { longUrl } });
//   if (existing) return res.json({ code: existing.shortCode });

  const shortCode = nanoid(6);
  const newUrl = await prisma.url.create({
    data: { longUrl, shortCode }
  });
  res.status(201).json({ code: newUrl.shortCode });
});
*/

// app.get('/redirect', async (req: Request, res: Response): Promise<any> => {
//   const { code } = req.query;
//   const entry = await prisma.url.findUnique({ where: { shortCode: String(code) } });
  
//   if (!entry) return res.status(404).json({ error: "Short code not found" });
//   res.redirect(entry.longUrl);
// });


app.get('/redirect', createRateLimiter(50, 120),async (req: Request, res: Response): Promise<any> => {
  const { code, password } = req.query;

  const shortCode = String(code);

  // let entry: any = cacheService.get(shortCode);
  let entry = await redisCache.get(shortCode);
  // console.log('entry----------------',entry, code);

  if (entry === undefined || entry === null){
    entry = await prisma.url.findUnique({ where: { shortCode } });
    if (entry) {
      await redisCache.set(shortCode, entry, 3600);
    } else{
      await redisCache.set(shortCode, "NOT_FOUND", 60);
    }
  }

  if (entry === "NOT_FOUND" || !entry || entry.deletedAt){
    return res.status(404).json({ error: "Link not found" });
  }

  if (entry.expiresAt && new Date() > entry.expiresAt) {
    console.log('entry----------------',entry, code);
    return res.status(410).json({ error: "This link has expired" });
  }

  if (entry.password && entry.password !== password) {
    return res.status(401).json({ 
      error: "This link is password protected. Please provide the correct password." 
    });
  }

  await prisma.url.update({
    where: { id: entry.id },
    data: { clicks: { increment: 1 }, lastAccessedAt: new Date() }
  }).catch(err => console.error("Analytics update failed", err));

  // res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Cache-Control', 'no-cache')

  res.redirect(entry.longUrl);
});

// old delete
/*
app.delete('/shorten/:code', async (req: Request, res: Response) => {
  try {
    await prisma.url.delete({ where: { shortCode: req.params.code } });
    res.status(204).send();
  } catch (e) {
    res.status(404).json({ error: "Code not found" });
  }
});
*/

app.post('/shorten', 
  // createRateLimiter(10, 60), 
  timeMiddleware('Auth', authenticate), 
  tierRateLimiter,
  async (req: Request, res: Response): Promise<any> => {
  const { longUrl, expiresAt, customCode, password } = req.body;
  const user = req.user!; 

  let shortCode = customCode || nanoid(6);
  const existing = await prisma.url.findUnique({ where: { shortCode } });
  if (existing) return res.status(409).json({ error: "Custom code already in use. Please choose another one." });

  const newUrl = await prisma.url.create({
    data: { 
      longUrl, 
      shortCode, 
      password: password || null, 
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      ownerId: user.id 
    }
  });
  res.status(201).json({ code: newUrl.shortCode });
});

app.use(createRateLimiter(100, 60));

app.post('/shorten/bulk', timeMiddleware('Auth', authenticate), timeMiddleware('TierCheck', tierCheck), async (req: Request, res: Response): Promise<any> => {
  const { urls } = req.body;
  const user = req.user!;

  // if (user.tier !== 'enterprise') {
  //   return res.status(403).json({ 
  //     error: "Bulk creation is an Enterprise feature. Please upgrade your plan." 
  //   });
  // }

  if (!Array.isArray(urls)) {
    return res.status(400).json({ error: "Input must be an array of URLs" });
  }
  const results = [];

  for (const item of urls) {
    try {
      if (!item.longUrl) throw new Error("Missing longUrl");
      
      const shortCode = item.customCode || nanoid(6);
      
      const newUrl = await prisma.url.create({
        data: {
          longUrl: item.longUrl,
          shortCode: shortCode,
          ownerId: user.id
        }
      });
      
      results.push({ longUrl: item.longUrl, code: newUrl.shortCode, status: "success" });
    } catch (error: any) {
      // console.log(error);
      // P2002 is the error code for unique constraint violation
      results.push({ 
        longUrl: item.longUrl, 
        error: error.code === 'P2002' ? "Code already taken" : error.message, 
        status: "error" 
      });
    }
  }
  res.status(207).json(results);
})

app.delete('/shorten/:code', timeMiddleware('Auth', authenticate), async (req: Request, res: Response): Promise<any> => {
  const { code } = req.params;
  const user = req.user!;

  const urlEntry = await prisma.url.findUnique({ where: { shortCode: code } });

  if (!urlEntry || urlEntry.deletedAt) return res.status(404).json({ error: "Link not found" });
  if (urlEntry.ownerId !== user.id) return res.status(403).json({ error: "Forbidden: You don't own this link" });

  await prisma.url.update({
    where: { shortCode: code },
    data: { deletedAt: new Date() }
  });

  res.status(204).send();
});

app.patch('/shorten/:code', timeMiddleware('Auth', authenticate), async (req: Request, res: Response): Promise<any> => {
  const { code } = req.params;
  const { longUrl, expiresAt, password } = req.body;
  const user = req.user!;

  const urlEntry = await prisma.url.findUnique({ where: { shortCode: code } });

  if (!urlEntry || urlEntry.deletedAt) return res.status(404).json({ error: "Link not found" });
  if (urlEntry.ownerId !== user.id) return res.status(403).json({ error: "Forbidden: You don't own this link" });


  const updated = await prisma.url.update({
    where: { shortCode: code },
    data: {
      longUrl: longUrl ?? urlEntry.longUrl,
      password: password !== undefined ? password : urlEntry.password,
      expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : urlEntry.expiresAt
    }
  });
  console.log('updated----------------',updated);
  await redisCache.set(updated.shortCode, updated, 3600);
  res.status(200).json(updated);
});

app.get('/urls',timeMiddleware('Auth', authenticate), async (req: Request, res: Response): Promise<any> => {
  const user = req.user!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  try{
  const urls = await prisma.url.findMany({
    where: { 
      ownerId: user.id,
      deletedAt: null 
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit 
  });

  const totalCount = await prisma.url.count({
    where: { 
      ownerId: user.id,
      deletedAt: null 
    }
  });

  res.json({
    data: urls,
    meta: {
      totalItems: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      limit
    }
  });
} catch (error) {
  console.error('Error fetching URLs:', error);
  res.status(500).json({ error: 'Internal server error' });
}
});


export default app;
