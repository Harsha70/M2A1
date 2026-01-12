import request from 'supertest';
import app from './app';

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

  it('should redirect successfully if expiry date is in the future', async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);

    const createRes = await request(app)
      .post('/shorten')
      .set('x-api-key', abc_KEY)
      .send({ longUrl: 'https://example.com', expiresAt: futureDate.toISOString() });
    console.log('createRes----------------',createRes.body);
    
    const res = await request(app).get(`/redirect?code=${createRes.body.code}`);
    expect(res.status).toBe(302);
  });

  it('should return 410 Gone if the URL has expired', async () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1);

    const createRes = await request(app)
      .post('/shorten')
      .set('x-api-key', abc_KEY)
      .send({ longUrl: 'https://example.com', expiresAt: pastDate.toISOString() });

    const res = await request(app).get(`/redirect?code=${createRes.body.code}`);
    
    expect(res.status).toBe(410);
    expect(res.body).toHaveProperty('error', 'This link has expired');
  });

  it('should allow creating a URL with a custom code', async () => {
    const customCode = `my-custom-link${Math.random()}` 
    const res = await request(app)
      .post('/shorten')
      .set('x-api-key', def_KEY)
      .send({ 
        longUrl: 'https://google.com', 
        customCode
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(customCode);
  });

  it('should return 409 if the custom code is already taken', async () => {
    await request(app)
      .post('/shorten')
      .set('x-api-key', def_KEY)
      .send({ longUrl: 'https://a.com', customCode: 'taken-code' });

    const res = await request(app)
      .post('/shorten')
      .set('x-api-key', def_KEY)
      .send({ longUrl: 'https://b.com', customCode: 'taken-code' });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error', 'Custom code already in use. Please choose another one.');
  });

  it('should shorten multiple URLs in one request', async () => {
    const random = Math.random()
    const res = await request(app)
      .post('/shorten/bulk')
      .set('x-api-key', ENTERPRISE_KEY)
      .send({
        urls: [
            { longUrl: `https://facebook${random}.com`},
            { longUrl: `https://google${random}.com`, customCode: `google${random}` },
        ]
      });
    expect(res.status).toBe(207);
    expect(res.body).toHaveLength(2);
    expect(res.body[1]).toHaveProperty('code', `google${random}`);
    
  });

  it('should handle partial failures (e.g., duplicate custom code)', async () => {
    const futureDate = new Date();
    const random = Math.random()
    const createRes = await request(app)
      .post('/shorten')
      .set('x-api-key', ENTERPRISE_KEY)
      .send({ longUrl: 'https://duplicate.com', customCode: `duplicate-code${random}`, expiresAt: futureDate.toISOString() });
    
    const res = await request(app).post('/shorten/bulk')
    .set('x-api-key', ENTERPRISE_KEY)
    .send({
        urls: [
            {longUrl: 'https://valid.com'},
            {longUrl: 'https://invalid.com', customCode: `duplicate-code${random}`}
        ]
    });
    expect(res.body[0].status).toBe('success');
    expect(res.body[1].status).toBe('error');
    expect(res.body[1].error).toBe('Code already taken');
  })

  it('should block hobby users from bulk creation', async () => {
    const res = await request(app)
      .post('/shorten/bulk')
      .set('x-api-key', HOBBY_KEY)
      .send({ urls: [{ longUrl: 'https://test.com' }] });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Enterprise feature/);
  });

  it('should allow enterprise users to use bulk creation', async () => {
    const res = await request(app)
      .post('/shorten/bulk')
      .set('x-api-key', ENTERPRISE_KEY)
      .send({ urls: [{ longUrl: 'https://test.com' }] });

    expect(res.status).toBe(207);
  });

  it('should allow a user to edit longUrl of a shorten link', async () => {
    const createRes = await request(app)
      .post('/shorten')
      .set('x-api-key', def_KEY)
      .send({ longUrl: 'https://beforeedit.com' });

    const code = createRes.body.code;
    console.log('createRes----------------',createRes.body);

    await request(app)
      .patch(`/shorten/${code}`)
      .set('x-api-key', def_KEY)
      .send({ longUrl: 'https://afteredit.com' });

    const checkActive = await request(app).get(`/redirect?code=${code}`);
    expect(checkActive.status).toBe(302);
  });

  it('should allow a user to reactivate an expired link', async () => {
    const pastDate = new Date(Date.now() - 10000).toISOString();
    const createRes = await request(app)
      .post('/shorten')
      .set('x-api-key', def_KEY)
      .send({ longUrl: 'https://reactivate.com', expiresAt: pastDate });

    const code = createRes.body.code;
    console.log('createRes----------------',createRes.body);

    const checkExpired = await request(app).get(`/redirect?code=${code}`);
    expect(checkExpired.status).toBe(410);

    await request(app)
      .patch(`/shorten/${code}`)
      .set('x-api-key', def_KEY)
      .send({ expiresAt: null });

    const checkActive = await request(app).get(`/redirect?code=${code}`);
    expect(checkActive.status).toBe(302);
  });

  it('should block editing a link owned by someone else', async () => {

    const defLink = await request(app)
      .post('/shorten').set('x-api-key', def_KEY).send({ longUrl: 'https://defgh.com' });

    const res = await request(app)
      .patch(`/shorten/${defLink.body.code}`)
      .set('x-api-key', abc_KEY)
      .send({ longUrl: 'https://changed.com' });

    expect(res.status).toBe(403);
  });

  it('should block access if password is required but not provided', async () => {
    const create = await request(app)
      .post('/shorten')
      .set('x-api-key', def_KEY)
      .send({ longUrl: 'https://secret.com', password: '123' });

    const res = await request(app).get(`/redirect?code=${create.body.code}`);
    expect(res.status).toBe(401);
  });

  it('should allow access if correct password is provided', async () => {
    const create = await request(app)
      .post('/shorten')
      .set('x-api-key', def_KEY)
      .send({ longUrl: 'https://secret.com', password: '123' });

    const res = await request(app).get(`/redirect?code=${create.body.code}&password=123`);
    expect(res.status).toBe(302);
  });

  it('should allow editing a password on an existing link', async () => {
    const create = await request(app)
      .post('/shorten')
      .set('x-api-key', def_KEY)
      .send({ longUrl: 'https://change.com' });

    await request(app)
      .patch(`/shorten/${create.body.code}`)
      .set('x-api-key', def_KEY)
      .send({ password: 'new-password' });

    const res = await request(app).get(`/redirect?code=${create.body.code}&password=wrong`);
    expect(res.status).toBe(401);
  });

  it('should return only URLs belonging to the authenticated user', async () => {
    const res = await request(app).get('/urls').set('x-api-key', def_KEY);

    expect(res.status).toBe(200);
  });

  it('should return 401 if attacker is trying to access other user urls', async () => {
    const res = await request(app).get('/urls').set('x-api-key', 'invalid_key');
    expect(res.status).toBe(401);
  });

  it('should return 200 and UP status for server and database', async () => {
    const res = await request(app).get('/health');
    
    expect(res.status).toBe(200);
    expect(res.body.checks.server).toBe('UP');
    expect(res.body.checks.database).toBe('UP');
    expect(res.body).toHaveProperty('uptime');
  });

});
