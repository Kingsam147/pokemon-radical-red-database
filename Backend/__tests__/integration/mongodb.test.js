const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

let mongoServer;
let client;
let db;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  client = new MongoClient(uri);
  await client.connect();
  db = client.db('test');
});

afterAll(async () => {
  await client.close();
  await mongoServer.stop();
});

describe('MongoDB connectivity', () => {
  test('connects and pings the server successfully', async () => {
    const result = await db.command({ ping: 1 });
    expect(result.ok).toBe(1);
  });

  test('inserts and retrieves a document', async () => {
    const collection = db.collection('test_items');
    await collection.insertOne({ name: 'Charizard', type: 'Fire' });
    const doc = await collection.findOne({ name: 'Charizard' });
    expect(doc).not.toBeNull();
    expect(doc.type).toBe('Fire');
  });

  test('updates a document', async () => {
    const collection = db.collection('test_items');
    await collection.updateOne({ name: 'Charizard' }, { $set: { level: 50 } });
    const doc = await collection.findOne({ name: 'Charizard' });
    expect(doc.level).toBe(50);
  });

  test('deletes a document', async () => {
    const collection = db.collection('test_items');
    await collection.deleteOne({ name: 'Charizard' });
    const doc = await collection.findOne({ name: 'Charizard' });
    expect(doc).toBeNull();
  });

  test('replaceOne with upsert creates new document when none exists', async () => {
    const collection = db.collection('myTeamSets');
    const userId = 'user-test-123';
    await collection.replaceOne({ userId }, { teamA: [], userId }, { upsert: true });
    const doc = await collection.findOne({ userId });
    expect(doc).not.toBeNull();
    expect(doc.teamA).toEqual([]);
  });
});
