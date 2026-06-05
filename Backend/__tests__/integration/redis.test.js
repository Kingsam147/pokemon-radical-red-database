const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let redis;
let redisAvailable = false;

beforeAll(async () => {
  redis = new Redis(REDIS_URL, {
    lazyConnect: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    retryStrategy: () => null,
  });
  try {
    await redis.connect();
    await redis.ping();
    redisAvailable = true;
  } catch {
    redisAvailable = false;
  }
});

afterAll(async () => {
  await redis.quit().catch(() => {});
});

const skipIfUnavailable = () => {
  if (!redisAvailable) {
    console.log('Redis not available — skipping test');
    return true;
  }
  return false;
};

describe('Redis connectivity (integration)', () => {
  test('PING returns PONG', async () => {
    if (skipIfUnavailable()) return;
    const result = await redis.ping();
    expect(result).toBe('PONG');
  });

  test('SET and GET a string value', async () => {
    if (skipIfUnavailable()) return;
    await redis.set('test:pokemon', 'Charizard', 'EX', 60);
    const value = await redis.get('test:pokemon');
    expect(value).toBe('Charizard');
    await redis.del('test:pokemon');
  });

  test('DEL removes a key', async () => {
    if (skipIfUnavailable()) return;
    await redis.set('test:deleteme', 'yes', 'EX', 60);
    await redis.del('test:deleteme');
    const value = await redis.get('test:deleteme');
    expect(value).toBeNull();
  });

  test('SETEX sets a key with expiry', async () => {
    if (skipIfUnavailable()) return;
    await redis.setex('test:expiry', 60, 'temp');
    const value = await redis.get('test:expiry');
    expect(value).toBe('temp');
    await redis.del('test:expiry');
  });
});
