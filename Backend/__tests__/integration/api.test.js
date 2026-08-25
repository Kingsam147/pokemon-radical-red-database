const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');
const cookieSignature = require('cookie-signature');

jest.mock('../../infrastructure/logger/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
  security: jest.fn(), setUser: jest.fn(), clearUser: jest.fn(),
}));

// Never exercised (no test sends an Authorization: Bearer header), but resolveIdentity
// requires it at module load — mocked so requiring it doesn't reach the real Auth0 SDK
// setup, which needs AUTH0_AUDIENCE / AUTH0_ISSUER_BASE_URL to be configured.
jest.mock('../../identity/jwtCheck', () => jest.fn());

const signGuestCookie = (guestId) => {
  const signed = 's:' + cookieSignature.sign(guestId, 'test-secret');
  return `guest_id=${encodeURIComponent(signed)}`;
};

let mongoServer;
let mongoClient;
let app;

// Routers pull in boxControllers/teamControllers, which pull in BoxRepository/TeamRepository,
// which destructure `db` from infrastructure/mongodbOptions at require time — so these must be
// required only after jest.doMock('../../infrastructure/mongodbOptions', ...) below has taken effect.
const buildApp = () => {
  const resolveIdentity = require('../../identity/resolveIdentity');
  const myBoxRoutes = require('../../interfaces/routes/myBoxRoutes');
  const teamRoutes = require('../../interfaces/routes/teamRoutes');

  const application = express();
  application.use(express.json());
  application.use(cookieParser('test-secret'));
  application.use('/myBoxes', resolveIdentity, myBoxRoutes);
  application.use('/teams', resolveIdentity, teamRoutes);

  application.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ message: err.message });
  });

  return application;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  mongoClient = new MongoClient(mongoServer.getUri());
  await mongoClient.connect();
  jest.doMock('../../infrastructure/mongodbOptions', () => ({
    db: mongoClient.db('test'),
    fetchModels: jest.fn(),
  }));
  app = buildApp();
});

afterAll(async () => {
  await mongoClient.close();
  await mongoServer.stop();
});

const GUEST_COOKIE = signGuestCookie('guest-integration-001');

describe('Express API — Box routes (integration)', () => {
  test('GET /myBoxes returns empty array for new guest', async () => {
    const res = await request(app).get('/myBoxes').set('Cookie', GUEST_COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.allBoxes).toEqual([]);
  });

  test('POST /myBoxes adds a new box', async () => {
    const res = await request(app).post('/myBoxes').set('Cookie', GUEST_COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  test('GET /myBoxes returns 401 without authentication', async () => {
    const res = await request(app).get('/myBoxes');
    expect(res.status).toBe(401);
  });
});

describe('Express API — GET /myBoxes/count (integration)', () => {
  const COUNT_COOKIE = signGuestCookie('guest-count-001');

  test('returns 401 without authentication', async () => {
    const res = await request(app).get('/myBoxes/count');
    expect(res.status).toBe(401);
  });

  test('auto-creates one box and returns count 1 when user has no boxes', async () => {
    const res = await request(app).get('/myBoxes/count').set('Cookie', COUNT_COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  test('returns correct count when user already has boxes', async () => {
    await request(app).post('/myBoxes').set('Cookie', COUNT_COOKIE);
    const res = await request(app).get('/myBoxes/count').set('Cookie', COUNT_COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });
});

describe('Express API — Team routes (integration)', () => {
  test('GET /teams/1 returns empty teams for new guest', async () => {
    const res = await request(app).get('/teams/1').set('Cookie', GUEST_COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.allTeams).toEqual({});
  });

  test('POST /teams/1 creates a new team', async () => {
    const res = await request(app)
      .post('/teams/1')
      .set('Cookie', GUEST_COOKIE)
      .send({ teamName: 'FireTeam' });
    expect(res.status).toBe(200);
    expect(res.body.teamName).toBe('FireTeam');
  });

  test('POST /teams/1 returns 400 when team already exists', async () => {
    const res = await request(app)
      .post('/teams/1')
      .set('Cookie', GUEST_COOKIE)
      .send({ teamName: 'FireTeam' });
    expect(res.status).toBe(400);
  });

  test('DELETE /teams/1/FireTeam removes the team', async () => {
    const res = await request(app)
      .delete('/teams/1/FireTeam')
      .set('Cookie', GUEST_COOKIE);
    expect(res.status).toBe(200);
  });

  test('PUT /teams/1/Squad saves a full team bench', async () => {
    await request(app)
      .post('/teams/1')
      .set('Cookie', GUEST_COOKIE)
      .send({ teamName: 'Squad' });
    const bench = [{ name: 'Pikachu' }, { name: 'Eevee' }];
    const res = await request(app)
      .put('/teams/1/Squad')
      .set('Cookie', GUEST_COOKIE)
      .send({ bench });
    expect(res.status).toBe(200);
    expect(res.body.currentBox.Squad).toEqual(bench);
  });
});
