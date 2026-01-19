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
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("./app"));
const redisCache_1 = require("./services/redisCache");
const db_1 = __importDefault(require("./db"));
describe('Redirect Caching Logic', () => {
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        redisCache_1.redisCache.clear();
        // cacheService.clear();
        yield db_1.default.url.upsert({
            where: { shortCode: 'test123' },
            create: { shortCode: 'test123', longUrl: 'https://test12.com', ownerId: 10 },
            update: {}
        });
    }));
    it('should hit the database once and then serve from cache', () => __awaiter(void 0, void 0, void 0, function* () {
        const prismaSpy = jest.spyOn(db_1.default.url, 'findUnique');
        yield (0, supertest_1.default)(app_1.default).get('/redirect?code=test123');
        expect(prismaSpy).toHaveBeenCalledTimes(1);
        yield (0, supertest_1.default)(app_1.default).get('/redirect?code=test123');
        expect(prismaSpy).toHaveBeenCalledTimes(1);
        prismaSpy.mockRestore();
    }));
    it('should allow requests under the limit', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app_1.default).get('/redirect?code=test123');
        expect(response.status).not.toBe(429);
        expect(response.headers['x-ratelimit-remaining']).toBe("99");
    }));
    it('should block requests over the limit', () => __awaiter(void 0, void 0, void 0, function* () {
        const ip = '::ffff:127.0.0.1';
        yield redisCache_1.redisCache.client.set(`rate-limit:${ip}`, 100);
        const response = yield (0, supertest_1.default)(app_1.default).get('/redirect?code=test123');
        expect(response.status).toBe(429);
        expect(response.body.error).toBe("Rate limit exceeded");
    }));
});
