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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
require("./instrument");
const express_1 = __importDefault(require("express"));
const nanoid_1 = require("nanoid");
const db_1 = __importDefault(require("./db"));
const logger_1 = __importDefault(require("./middleware/logger"));
const authentication_1 = require("./middleware/authentication");
const tierCheck_1 = require("./middleware/tierCheck");
const resTimelogging_1 = require("./middleware/resTimelogging");
const blacklistMiddleware_1 = require("./middleware/blacklistMiddleware");
const timeMiddlewares_1 = require("./middleware/timeMiddlewares");
// import { cacheService } from "./services/cache";
const redisCache_1 = require("./services/redisCache");
const rateLimit_1 = require("./middleware/rateLimit");
const tierRateLimiter_1 = require("./middleware/tierRateLimiter");
const rateLimitTokenBucket_1 = require("./middleware/rateLimitTokenBucket");
const retry_1 = require("./utils/retry");
exports.app = (0, express_1.default)();
exports.app.use(express_1.default.json());
exports.app.use((0, timeMiddlewares_1.timeMiddleware)('ResponseTime', resTimelogging_1.responseTimeNative));
exports.app.use((0, timeMiddlewares_1.timeMiddleware)('Blacklist', blacklistMiddleware_1.blacklistMiddleware));
exports.app.use((0, timeMiddlewares_1.timeMiddleware)('Logger', logger_1.default));
// app.use(tokenBucketLimiter);
exports.app.get('/health', 
// slidingWindowLimiter,
rateLimitTokenBucket_1.tokenBucketLimiter, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        yield db_1.default.$queryRaw `SELECT 1`;
        healthStatus.checks.database = "UP";
    }
    catch (error) {
        healthStatus.message = "ERROR";
        healthStatus.checks.database = "DOWN";
        res.status(503).json(healthStatus);
    }
    res.status(200).json(healthStatus);
}));
exports.app.get('/benchmark', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const testCode = 'perf_test_code';
    const iterations = 100;
    yield db_1.default.url.upsert({
        where: { shortCode: testCode },
        update: {},
        create: { shortCode: testCode, longUrl: "https://performance-test.com", ownerId: 11 }
    });
    // cacheService.clear();
    redisCache_1.redisCache.delete(testCode);
    const startNoCache = performance.now();
    for (let i = 0; i < iterations; i++) {
        yield db_1.default.url.findUnique({ where: { shortCode: testCode } });
    }
    const endNoCache = performance.now();
    const noCacheDuration = endNoCache - startNoCache;
    // cacheService.clear();
    redisCache_1.redisCache.delete(testCode);
    let hits = 0;
    let misses = 0;
    const startWithCache = performance.now();
    for (let i = 0; i < iterations; i++) {
        // const cached = cacheService.get(testCode);
        const cached = yield redisCache_1.redisCache.get(testCode);
        if (cached) {
            hits++;
        }
        else {
            misses++;
            const entry = yield db_1.default.url.findUnique({ where: { shortCode: testCode } });
            // cacheService.set(testCode, entry);
            yield redisCache_1.redisCache.set(testCode, entry);
        }
    }
    const endCache = performance.now();
    const cacheDuration = endCache - startWithCache;
    const improveFactor = (noCacheDuration / cacheDuration).toFixed(2);
    res.json({
        iterations,
        results: {
            noCache: {
                totalTime: `${noCacheDuration} ms`,
                avgTime: `${noCacheDuration / iterations} ms`,
            },
            withCache: {
                totalTime: `${cacheDuration} ms`,
                avgTime: `${cacheDuration / iterations} ms`,
                hitRatio: `${hits / iterations * 100}%`,
                missRatio: `${misses / iterations * 100}%`,
                hits,
                misses,
            }
        },
        verdict: `Cache improved performance by ${improveFactor}x`
    });
}));
exports.app.get("/debug-sentry", function mainHandler(req, res) {
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
exports.app.get('/redirect', (0, rateLimit_1.createRateLimiter)(50, 120), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code, password } = req.query;
    const shortCode = String(code);
    // let entry: any = cacheService.get(shortCode);
    let entry = yield redisCache_1.redisCache.get(shortCode);
    // console.log('entry----------------',entry, code);
    if (entry === undefined || entry === null) {
        entry = yield db_1.default.url.findUnique({ where: { shortCode } });
        if (entry) {
            yield redisCache_1.redisCache.set(shortCode, entry, 3600);
        }
        else {
            yield redisCache_1.redisCache.set(shortCode, "NOT_FOUND", 60);
        }
    }
    if (entry === "NOT_FOUND" || !entry || entry.deletedAt) {
        return res.status(404).json({ error: "Link not found" });
    }
    if (entry.expiresAt && new Date() > entry.expiresAt) {
        console.log('entry----------------', entry, code);
        return res.status(410).json({ error: "This link has expired" });
    }
    if (entry.password && entry.password !== password) {
        return res.status(401).json({
            error: "This link is password protected. Please provide the correct password."
        });
    }
    yield db_1.default.url.update({
        where: { id: entry.id },
        data: { clicks: { increment: 1 }, lastAccessedAt: new Date() }
    }).catch(err => console.error("Analytics update failed", err));
    // res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Cache-Control', 'no-cache');
    res.redirect(entry.longUrl);
}));
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
exports.app.post('/shorten', 
// createRateLimiter(10, 60), 
(0, timeMiddlewares_1.timeMiddleware)('Auth', authentication_1.authenticate), tierRateLimiter_1.tierRateLimiter, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { longUrl, expiresAt, customCode, password } = req.body;
    const user = req.user;
    let shortCode = customCode || (0, nanoid_1.nanoid)(6);
    const existing = yield db_1.default.url.findUnique({ where: { shortCode } });
    if (existing)
        return res.status(409).json({ error: "Custom code already in use. Please choose another one." });
    const newUrl = yield db_1.default.url.create({
        data: {
            longUrl,
            shortCode,
            password: password || null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            ownerId: user.id
        }
    });
    res.status(201).json({ code: newUrl.shortCode });
}));
exports.app.use((0, rateLimit_1.createRateLimiter)(100, 60));
exports.app.post('/shorten/bulk', (0, timeMiddlewares_1.timeMiddleware)('Auth', authentication_1.authenticate), (0, timeMiddlewares_1.timeMiddleware)('TierCheck', tierCheck_1.tierCheck), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { urls } = req.body;
    const user = req.user;
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
            if (!item.longUrl)
                throw new Error("Missing longUrl");
            const shortCode = item.customCode || (0, nanoid_1.nanoid)(6);
            const newUrl = yield db_1.default.url.create({
                data: {
                    longUrl: item.longUrl,
                    shortCode: shortCode,
                    ownerId: user.id
                }
            });
            results.push({ longUrl: item.longUrl, code: newUrl.shortCode, status: "success" });
        }
        catch (error) {
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
}));
exports.app.delete('/shorten/:code', (0, timeMiddlewares_1.timeMiddleware)('Auth', authentication_1.authenticate), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code } = req.params;
    const user = req.user;
    const urlEntry = yield db_1.default.url.findUnique({ where: { shortCode: code } });
    if (!urlEntry || urlEntry.deletedAt)
        return res.status(404).json({ error: "Link not found" });
    if (urlEntry.ownerId !== user.id)
        return res.status(403).json({ error: "Forbidden: You don't own this link" });
    yield db_1.default.url.update({
        where: { shortCode: code },
        data: { deletedAt: new Date() }
    });
    res.status(204).send();
}));
exports.app.patch('/shorten/:code', (0, timeMiddlewares_1.timeMiddleware)('Auth', authentication_1.authenticate), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code } = req.params;
    const { longUrl, expiresAt, password } = req.body;
    const user = req.user;
    const urlEntry = yield db_1.default.url.findUnique({ where: { shortCode: code } });
    if (!urlEntry || urlEntry.deletedAt)
        return res.status(404).json({ error: "Link not found" });
    if (urlEntry.ownerId !== user.id)
        return res.status(403).json({ error: "Forbidden: You don't own this link" });
    const updated = yield db_1.default.url.update({
        where: { shortCode: code },
        data: {
            longUrl: longUrl !== null && longUrl !== void 0 ? longUrl : urlEntry.longUrl,
            password: password !== undefined ? password : urlEntry.password,
            expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : urlEntry.expiresAt
        }
    });
    console.log('updated----------------', updated);
    yield redisCache_1.redisCache.set(updated.shortCode, updated, 3600);
    res.status(200).json(updated);
}));
exports.app.get('/urls', (0, timeMiddlewares_1.timeMiddleware)('Auth', authentication_1.authenticate), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    try {
        const urls = yield (0, retry_1.withExponentialBackoff)(() => db_1.default.url.findMany({
            where: {
                ownerId: user.id,
                deletedAt: null
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }), {
            maxAttempts: 3,
            baseDelay: 1000
        });
        const totalCount = yield db_1.default.url.count({
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
    }
    catch (error) {
        console.error('Error fetching URLs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
exports.default = exports.app;
