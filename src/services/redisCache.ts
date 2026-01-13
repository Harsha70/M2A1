import { createClient } from 'redis';

const client = createClient({
    // url: 'redis-13097.c16.us-east-1-3.ec2.cloud.redislabs.com:13097'
    username: 'Harsha',
    password: '!Se!qd8PNxQWR8b',
    socket: {
        host: 'redis-13097.c16.us-east-1-3.ec2.cloud.redislabs.com',
        port: 13097
    }
});

client.on('error', err => console.error('Redis Client Error', err));

(async () => {
    await client.connect();
})();

export const redisCache = {
  get: async (code: string) => {
    const data = await client.get(`url:${code}`);
    return data ? JSON.parse(data) : null;
  },
  
  set: async (code: string, entry: any, ttl?: number) => {
    await client.set(`url:${code}`, JSON.stringify(entry), {
      EX: ttl || 86400 
    });
  },

  delete: async (code: string) => {
    await client.del(`url:${code}`);
  }
};
// http://localhost:3010/redirect?code=my-custom-link