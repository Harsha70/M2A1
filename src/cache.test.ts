import request from 'supertest';
import app from './app';
import {redisCache} from './services/redisCache';
import { cacheService } from './services/cache';
import prisma from './db';

describe('Redirect Caching Logic', () => {
 beforeEach(async () => {
    redisCache.clear();
    // cacheService.clear();


    await prisma.url.upsert({
        where: { shortCode: 'test123' },
        create: { shortCode: 'test123', longUrl: 'https://test12.com', ownerId: 10 },
        update: {}
    })
 }) 
 
 it('should hit the database once and then serve from cache', async () => {
    const prismaSpy = jest.spyOn(prisma.url, 'findUnique')

    await request(app).get('/redirect?code=test123')
    expect(prismaSpy).toHaveBeenCalledTimes(1)
    await request(app).get('/redirect?code=test123')
    expect(prismaSpy).toHaveBeenCalledTimes(1)

    prismaSpy.mockRestore();
 });

 it('should allow requests under the limit', async () => {
    const response = await request(app).get('/redirect?code=test123');
    expect(response.status).not.toBe(429);
    expect(response.headers['x-ratelimit-remaining']).toBe("99");
  });

  it('should block requests over the limit', async () => {
    const ip = '::ffff:127.0.0.1'; 
    await redisCache.client.set(`rate-limit:${ip}`, 100);

    const response = await request(app).get('/redirect?code=test123');
    
    expect(response.status).toBe(429);
    expect(response.body.error).toBe("Rate limit exceeded");
  });

})
