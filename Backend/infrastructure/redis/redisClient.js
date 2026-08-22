const Redis = require('ioredis');

let client = null;
let available = false;

const connect = () => {
  const url = process.env.REDIS_URL;
  if (!url) return Promise.resolve();
  if (client) return Promise.resolve();

  client = new Redis(url, {
    lazyConnect: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    retryStrategy: () => null,
  });

  client.on('error', () => {
    available = false;
  });

  return client.connect()
    .then(() => { available = true; })
    .catch(() => { available = false; });
};

const get = async (key) => {
  if (!available || !client) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const set = async (key, value, ttlSeconds) => {
  if (!available || !client) return;
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    const Sentry = require('@sentry/node');
    Sentry.captureException(new Error(`Redis write failed for key: ${key}`));
  }
};

const del = async (key) => {
  if (!available || !client) return;
  try {
    await client.del(key);
  } catch {
    // Non-critical — cache will expire naturally
  }
};

const delPattern = async (pattern) => {
  if (!available || !client) return;
  try {
    const keys = [];
    const stream = client.scanStream({ match: pattern, count: 100 });
    await new Promise((resolve, reject) => {
      stream.on('data', (batch) => keys.push(...batch));
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    if (keys.length > 0) await client.del(keys);
  } catch {
    // Non-critical — cache will expire naturally
  }
};

const sendCommand = (...args) => {
  if (!available || !client) throw new Error('Redis unavailable');
  return client.call(...args);
};

module.exports = { connect, get, set, del, delPattern, sendCommand };
