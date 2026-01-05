import request from 'supertest';
import app from './app';

describe('URL Shortener API', () => {
    it('should create a short code for a new URL', async () => {
        const longUrl = `https://example.com/${Math.random().toString(36).substring(7)}`;
        const res = await request(app)
            .post('/shorten')
            .send({ longUrl });
        console.log('res----------------',app);
        
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('code');
    });

    it('should return the same short code for the same URL', async () => {
        const longUrl = `https://example.com/${Math.random().toString(36).substring(7)}`;
        
        const res1 = await request(app)
            .post('/shorten')
            .send({ longUrl });
        const code1 = res1.body.code;

        const res2 = await request(app)
            .post('/shorten')
            .send({ longUrl });
        const code2 = res2.body.code;

        expect(code1).toBe(code2);
    });

    it('should redirect to the original URL', async () => {
        const longUrl = `https://example.com/${Math.random().toString(36).substring(7)}`;
        const createRes = await request(app)
            .post('/shorten')
            .send({ longUrl });
        const code = createRes.body.code;

        const res = await request(app)
            .get(`/redirect?code=${code}`);
        
        expect(res.status).toBe(302);
        expect(res.header['location']).toBe(longUrl);
    });

    it('should return 404 for invalid code', async () => {
        const res = await request(app)
            .get('/redirect?code=invalid_code');
        
        expect(res.status).toBe(404);
    });

    it('should delete a URL', async () => {
        const longUrl = `https://example.com/${Math.random().toString(36).substring(7)}`;
        const createRes = await request(app)
            .post('/shorten')
            .send({ longUrl });
        const code = createRes.body.code;

        const res = await request(app)
            .delete(`/shorten/${code}`);
        
        expect(res.status).toBe(204);
    });

    it('should return 400 when an empty URL is sent', async () => {
    const res = await request(app)
        .post('/shorten')
        .send({ longUrl: "" }); 
    
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'URL is required and cannot be empty');
    });

    it('should return 400 when the URL field is missing entirely', async () => {
        const res = await request(app)
            .post('/shorten')
            .send({}); 
        
        expect(res.status).toBe(400);
    });
});
