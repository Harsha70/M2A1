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
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisCache = void 0;
const redis_1 = require("redis");
const client = (0, redis_1.createClient)({
    // url: 'redis-13097.c16.us-east-1-3.ec2.cloud.redislabs.com:13097'
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT)
    }
});
client.on('error', err => console.error('Redis Client Error', err));
client.on('connect', () => console.log('Connected to Redis Cloud'));
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield client.connect();
}))();
exports.redisCache = {
    get: (code) => __awaiter(void 0, void 0, void 0, function* () {
        const data = yield client.get(`url:${code}`);
        return data ? JSON.parse(data) : null;
    }),
    set: (code, entry, ttl) => __awaiter(void 0, void 0, void 0, function* () {
        yield client.set(`url:${code}`, JSON.stringify(entry), {
            EX: ttl || 86400
        });
    }),
    delete: (code) => __awaiter(void 0, void 0, void 0, function* () {
        yield client.del(`url:${code}`);
    }),
    clear: () => __awaiter(void 0, void 0, void 0, function* () {
        yield client.flushAll();
    }),
    client: client,
};
// http://localhost:3010/redirect?code=my-custom-link
