const store = new Map();
const timers = new Map();

const DRAFT_TTL_MS = 30 * 60 * 1000; // 30 minutes

const buildKey = (userId, sessionId) => `draft:${userId}:${sessionId}`;

const clearTimer = (key) => {
  if (timers.has(key)) {
    clearTimeout(timers.get(key));
    timers.delete(key);
  }
};

const scheduleExpiry = (key) => {
  clearTimer(key);
  const timer = setTimeout(() => {
    store.delete(key);
    timers.delete(key);
  }, DRAFT_TTL_MS);
  if (timer.unref) timer.unref(); // don't block process exit on pending drafts
  timers.set(key, timer);
};

const set = (userId, sessionId, entity) => {
  const key = buildKey(userId, sessionId);
  store.set(key, entity);
  scheduleExpiry(key);
};

const get = (userId, sessionId) => store.get(buildKey(userId, sessionId)) ?? null;

const has = (userId, sessionId) => store.has(buildKey(userId, sessionId));

const remove = (userId, sessionId) => {
  const key = buildKey(userId, sessionId);
  clearTimer(key);
  store.delete(key);
};

module.exports = { set, get, has, remove };
