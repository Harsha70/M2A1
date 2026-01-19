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
describe('Ownership and Security', () => {
    const abc_KEY = '123';
    const def_KEY = '234';
    const HOBBY_KEY = 'hobby_key_123';
    const ENTERPRISE_KEY = 'enterprise_key_456';
    /*
      it('should allow ABC to delete her own link', async () => {
        const create = await request(app)
          .post('/shorten').set('x-api-key', abc_KEY).send({ longUrl: 'https://a12345.com' });
        
        // console.log('create----------------',create.body.code);
        expect(create.status).toBe(201);
    
        const res = await request(app)
          .delete(`/shorten/${create.body.code}`).set('x-api-key', abc_KEY);
        
        expect(res.status).toBe(204);
      });
    
      it('should block DEF from deleting ABCs link', async () => {
        const abcLink = await request(app)
          .post('/shorten').set('x-api-key', abc_KEY).send({ longUrl: 'https://abcs.com' });
    
        const res = await request(app)
          .delete(`/shorten/${abcLink.body.code}`).set('x-api-key', def_KEY);
        
        expect(res.status).toBe(403);
      });
    */
    it('should redirect successfully if expiry date is in the future', () => __awaiter(void 0, void 0, void 0, function* () {
        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + 1);
        const createRes = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .set('x-api-key', abc_KEY)
            .send({ longUrl: 'https://example.com', expiresAt: futureDate.toISOString() });
        console.log('createRes----------------', createRes.body);
        const res = yield (0, supertest_1.default)(app_1.default).get(`/redirect?code=${createRes.body.code}`);
        expect(res.status).toBe(302);
    }));
    it('should return 410 Gone if the URL has expired', () => __awaiter(void 0, void 0, void 0, function* () {
        const pastDate = new Date();
        pastDate.setHours(pastDate.getHours() - 1);
        const createRes = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .set('x-api-key', abc_KEY)
            .send({ longUrl: 'https://example.com', expiresAt: pastDate.toISOString() });
        const res = yield (0, supertest_1.default)(app_1.default).get(`/redirect?code=${createRes.body.code}`);
        expect(res.status).toBe(410);
        expect(res.body).toHaveProperty('error', 'This link has expired');
    }));
    it('should allow creating a URL with a custom code', () => __awaiter(void 0, void 0, void 0, function* () {
        const customCode = `my-custom-link${Math.random()}`;
        const res = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .set('x-api-key', def_KEY)
            .send({
            longUrl: 'https://google.com',
            customCode
        });
        expect(res.status).toBe(201);
        expect(res.body.code).toBe(customCode);
    }));
    it('should return 409 if the custom code is already taken', () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .set('x-api-key', def_KEY)
            .send({ longUrl: 'https://a.com', customCode: 'taken-code' });
        const res = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .set('x-api-key', def_KEY)
            .send({ longUrl: 'https://b.com', customCode: 'taken-code' });
        expect(res.status).toBe(409);
        expect(res.body).toHaveProperty('error', 'Custom code already in use. Please choose another one.');
    }));
    it('should shorten multiple URLs in one request', () => __awaiter(void 0, void 0, void 0, function* () {
        const random = Math.random();
        const res = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten/bulk')
            .set('x-api-key', ENTERPRISE_KEY)
            .send({
            urls: [
                { longUrl: `https://facebook${random}.com` },
                { longUrl: `https://google${random}.com`, customCode: `google${random}` },
            ]
        });
        expect(res.status).toBe(207);
        expect(res.body).toHaveLength(2);
        expect(res.body[1]).toHaveProperty('code', `google${random}`);
    }));
    it('should handle partial failures (e.g., duplicate custom code)', () => __awaiter(void 0, void 0, void 0, function* () {
        const futureDate = new Date();
        const random = Math.random();
        const createRes = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .set('x-api-key', ENTERPRISE_KEY)
            .send({ longUrl: 'https://duplicate.com', customCode: `duplicate-code${random}`, expiresAt: futureDate.toISOString() });
        const res = yield (0, supertest_1.default)(app_1.default).post('/shorten/bulk')
            .set('x-api-key', ENTERPRISE_KEY)
            .send({
            urls: [
                { longUrl: 'https://valid.com' },
                { longUrl: 'https://invalid.com', customCode: `duplicate-code${random}` }
            ]
        });
        expect(res.body[0].status).toBe('success');
        expect(res.body[1].status).toBe('error');
        expect(res.body[1].error).toBe('Code already taken');
    }));
    it('should block hobby users from bulk creation', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten/bulk')
            .set('x-api-key', HOBBY_KEY)
            .send({ urls: [{ longUrl: 'https://test.com' }] });
        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Enterprise feature/);
    }));
    it('should allow enterprise users to use bulk creation', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten/bulk')
            .set('x-api-key', ENTERPRISE_KEY)
            .send({ urls: [{ longUrl: 'https://test.com' }] });
        expect(res.status).toBe(207);
    }));
    it('should allow a user to edit longUrl of a shorten link', () => __awaiter(void 0, void 0, void 0, function* () {
        const createRes = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .set('x-api-key', def_KEY)
            .send({ longUrl: 'https://beforeedit.com' });
        const code = createRes.body.code;
        console.log('createRes----------------', createRes.body);
        yield (0, supertest_1.default)(app_1.default)
            .patch(`/shorten/${code}`)
            .set('x-api-key', def_KEY)
            .send({ longUrl: 'https://afteredit.com' });
        const checkActive = yield (0, supertest_1.default)(app_1.default).get(`/redirect?code=${code}`);
        expect(checkActive.status).toBe(302);
    }));
    it('should allow a user to reactivate an expired link', () => __awaiter(void 0, void 0, void 0, function* () {
        const pastDate = new Date(Date.now() - 10000).toISOString();
        const createRes = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .set('x-api-key', def_KEY)
            .send({ longUrl: 'https://reactivate.com', expiresAt: pastDate });
        const code = createRes.body.code;
        console.log('createRes----------------', createRes.body);
        const checkExpired = yield (0, supertest_1.default)(app_1.default).get(`/redirect?code=${code}`);
        expect(checkExpired.status).toBe(410);
        yield (0, supertest_1.default)(app_1.default)
            .patch(`/shorten/${code}`)
            .set('x-api-key', def_KEY)
            .send({ expiresAt: null });
        const checkActive = yield (0, supertest_1.default)(app_1.default).get(`/redirect?code=${code}`);
        expect(checkActive.status).toBe(302);
    }));
    it('should block editing a link owned by someone else', () => __awaiter(void 0, void 0, void 0, function* () {
        const defLink = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten').set('x-api-key', def_KEY).send({ longUrl: 'https://defgh.com' });
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/shorten/${defLink.body.code}`)
            .set('x-api-key', abc_KEY)
            .send({ longUrl: 'https://changed.com' });
        expect(res.status).toBe(403);
    }));
    it('should block access if password is required but not provided', () => __awaiter(void 0, void 0, void 0, function* () {
        const create = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .set('x-api-key', def_KEY)
            .send({ longUrl: 'https://secret.com', password: '123' });
        const res = yield (0, supertest_1.default)(app_1.default).get(`/redirect?code=${create.body.code}`);
        expect(res.status).toBe(401);
    }));
    it('should allow access if correct password is provided', () => __awaiter(void 0, void 0, void 0, function* () {
        const create = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .set('x-api-key', def_KEY)
            .send({ longUrl: 'https://secret.com', password: '123' });
        const res = yield (0, supertest_1.default)(app_1.default).get(`/redirect?code=${create.body.code}&password=123`);
        expect(res.status).toBe(302);
    }));
    it('should allow editing a password on an existing link', () => __awaiter(void 0, void 0, void 0, function* () {
        const create = yield (0, supertest_1.default)(app_1.default)
            .post('/shorten')
            .set('x-api-key', def_KEY)
            .send({ longUrl: 'https://change.com' });
        yield (0, supertest_1.default)(app_1.default)
            .patch(`/shorten/${create.body.code}`)
            .set('x-api-key', def_KEY)
            .send({ password: 'new-password' });
        const res = yield (0, supertest_1.default)(app_1.default).get(`/redirect?code=${create.body.code}&password=wrong`);
        expect(res.status).toBe(401);
    }));
    it('should return only URLs belonging to the authenticated user', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get('/urls').set('x-api-key', def_KEY);
        expect(res.status).toBe(200);
    }));
    it('should return 401 if attacker is trying to access other user urls', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get('/urls').set('x-api-key', 'invalid_key');
        expect(res.status).toBe(401);
    }));
    it('should return 200 and UP status for server and database', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.checks.server).toBe('UP');
        expect(res.body.checks.database).toBe('UP');
        expect(res.body).toHaveProperty('uptime');
    }));
});
