const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../redis/redisClient');

const makeStore = (prefix) => {
  try {
    return new RedisStore({
      prefix,
      sendCommand: (...args) => redis.sendCommand(...args),
    });
  } catch {
    return undefined;
  }
};

const onLimitReached = (_req, res) => {
  res.status(429).json({
    message: 'Too many requests — please wait a moment before trying again.',
    retryAfter: 60,
  });
};

// 200 requests per minute — covers all routes
const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: makeStore('rl:global:'),
  handler: onLimitReached,
  skip: (req) => req.path === '/health',
});

// 150 requests per minute — damage calc is CPU-intensive
const calcLimiter = rateLimit({
  windowMs: 60_000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: makeStore('rl:calc:'),
  handler: onLimitReached,
});

// 10 requests per minute — prevents mass guest session creation
const guestInitLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: makeStore('rl:guest:'),
  handler: onLimitReached,
});

module.exports = { globalLimiter, calcLimiter, guestInitLimiter };
