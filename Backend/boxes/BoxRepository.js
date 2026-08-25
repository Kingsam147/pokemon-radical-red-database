const { db } = require('../infrastructure/mongodbOptions');
const redis = require('../infrastructure/redis/redisClient');
const { getModels } = require('../game-data/loadModels');
const BoxEntity = require('./BoxEntity');

const BOX_SCHEMA_VERSION = process.env.BOX_SCHEMA_VERSION || '1';
const BOX_CACHE_TTL = 600;
const BOX_COUNT_TTL = 30;

const boxCacheKey = (userId, index) => `box:${userId}:${index}:v${BOX_SCHEMA_VERSION}`;
const boxCountCacheKey = (userId) => `boxcount:${userId}`;

const loadAll = async (userId) => {
  const docs = await db.collection('myBoxes').find({ userId }).toArray();
  if (!docs.length) return [];
  const models = getModels();
  return docs.map(({ _id, userId: _uid, ...boxDoc }) => BoxEntity.fromStoredDoc(boxDoc, models));
};

const saveAll = async (userId, boxes) => {
  await db.collection('myBoxes').deleteMany({ userId });
  if (boxes.length > 0) {
    await db.collection('myBoxes').insertMany(boxes.map((box) => ({ ...box.toJSON(), userId })));
  }
};

const loadOne = async (userId, index) => {
  const key = boxCacheKey(userId, index);
  const cached = await redis.get(key);
  if (cached) return BoxEntity.fromStoredDoc(cached, getModels());

  const docs = await db
    .collection('myBoxes')
    .find({ userId })
    .sort({ _id: 1 })
    .skip(index)
    .limit(1)
    .toArray();
  if (!docs.length) return undefined;
  const { _id, userId: _uid, ...boxDoc } = docs[0];
  await redis.set(key, boxDoc, BOX_CACHE_TTL);
  return BoxEntity.fromStoredDoc(boxDoc, getModels());
};

const invalidateOne = async (userId, index) => {
  await redis.del(boxCacheKey(userId, index));
};

const invalidateAll = async (userId) => {
  await redis.delPattern(`box:${userId}:*`);
};

const getCachedCount = async (userId) => {
  const cached = await redis.get(boxCountCacheKey(userId));
  return cached !== null ? Number(cached) : null;
};

const setCachedCount = async (userId, count) => {
  await redis.set(boxCountCacheKey(userId), count, BOX_COUNT_TTL);
};

const invalidateCachedCount = async (userId) => {
  await redis.del(boxCountCacheKey(userId));
};

const preWarmCache = async (userId, boxes) => {
  await Promise.all(
    boxes.map(async (box, index) => {
      const key = boxCacheKey(userId, index);
      const cached = await redis.get(key);
      if (!cached) await redis.set(key, box.toJSON(), BOX_CACHE_TTL);
    }),
  );
};

const reassignOwner = async (oldUserId, newUserId) => {
  const result = await db
    .collection('myBoxes')
    .updateMany({ userId: oldUserId }, { $set: { userId: newUserId } });
  return result.modifiedCount;
};

module.exports = {
  loadAll,
  saveAll,
  loadOne,
  invalidateOne,
  invalidateAll,
  getCachedCount,
  setCachedCount,
  invalidateCachedCount,
  preWarmCache,
  reassignOwner,
};
