import request from 'supertest';
import app from './app';
import { cacheService } from './services/cache';
import prisma from './db';

describe('Redirect Caching Logic', () => {
 beforeEach(async () => {
    cacheService.clear();

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
 })
})
