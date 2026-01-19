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
describe('URL Shortener API', () => {
    it('should create a short code for a new URL', () => __awaiter(void 0, void 0, void 0, function* () {
        const longUrl = `https://example.com/${Math.random().toString(36).substring(7)}`;
        const res = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .send({ longUrl });
        console.log('res----------------', app_1.default);
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('code');
    }));
    it('should return the same short code for the same URL', () => __awaiter(void 0, void 0, void 0, function* () {
        const longUrl = `https://example.com/${Math.random().toString(36).substring(7)}`;
        const res1 = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .send({ longUrl });
        const code1 = res1.body.code;
        const res2 = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .send({ longUrl });
        const code2 = res2.body.code;
        expect(code1).toBe(code2);
    }));
    it('should redirect to the original URL', () => __awaiter(void 0, void 0, void 0, function* () {
        const longUrl = `https://example.com/${Math.random().toString(36).substring(7)}`;
        const createRes = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .send({ longUrl });
        const code = createRes.body.code;
        const res = yield (0, supertest_1.default)(app_1.default)
            .get(`/redirect?code=${code}`);
        expect(res.status).toBe(302);
        expect(res.header['location']).toBe(longUrl);
    }));
    it('should return 404 for invalid code', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default)
            .get('/redirect?code=invalid_code');
        expect(res.status).toBe(404);
    }));
    it('should delete a URL', () => __awaiter(void 0, void 0, void 0, function* () {
        const longUrl = `https://example.com/${Math.random().toString(36).substring(7)}`;
        const createRes = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .send({ longUrl });
        const code = createRes.body.code;
        const res = yield (0, supertest_1.default)(app_1.default)
            .delete(`/shorten/${code}`);
        expect(res.status).toBe(204);
    }));
    it('should return 400 when an empty URL is sent', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .send({ longUrl: "" });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'URL is required and cannot be empty');
    }));
    it('should return 400 when the URL field is missing entirely', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .send({});
        expect(res.status).toBe(400);
    }));
});
