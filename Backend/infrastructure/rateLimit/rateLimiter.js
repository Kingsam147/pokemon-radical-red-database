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

// The e2e CI job runs 30+ Playwright tests sequentially against one backend
// instance, all from the same runner IP, each doing a full page load (guest
// init + misc data + box + teams). That traffic shape is nothing like a
// single real client and trips these limits well before the suite finishes,
// so requests outside the very first few tests come back 429 and cascade
// into unrelated test failures (e.g. loadInitialData never completing).
// NODE_ENV=test is only ever set by CI/local test runs (see .github/workflows/ci.yml
// and Backend package.json test scripts) — production and normal dev keep
// the tuned limits below untouched.
const isTestEnv = process.env.NODE_ENV === 'test';

// 200 requests per minute — covers all routes
const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: isTestEnv ? 5000 : 200,
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
  max: isTestEnv ? 5000 : 150,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: makeStore('rl:calc:'),
  handler: onLimitReached,
});

// 10 requests per minute — prevents mass guest session creation
const guestInitLimiter = rateLimit({
  windowMs: 60_000,
  max: isTestEnv ? 5000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: makeStore('rl:guest:'),
  handler: onLimitReached,
});

module.exports = { globalLimiter, calcLimiter, guestInitLimiter };
