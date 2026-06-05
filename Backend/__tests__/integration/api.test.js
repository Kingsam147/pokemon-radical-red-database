const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');
const cookieSignature = require('cookie-signature');

// mockDb is accessible inside the jest.mock factory (name starts with mock — Jest allows it)
const mockDb = { ref: null };

jest.mock('../../Config/mongodbOptions', () => ({
  get db() { return mockDb.ref; },
  fetchModels: jest.fn(),
}));

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  setupExpressErrorHandler: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureEvent: jest.fn(),
  captureException: jest.fn(),
  setUser: jest.fn(),
  withScope: jest.fn(),
}));

jest.mock('../../Services/pokemonService', () => ({
  createPokemon: jest.fn((text) => ({ name: text.split('\n')[0].trim().split('@')[0].trim() })),
  hasDuplicate: jest.fn(() => false),
}));

jest.mock('../../Services/formService', () => ({
  checkMega: jest.fn(() => false),
  addMega: jest.fn((text) => ({ name: text.split('\n')[0].trim().split('@')[0].trim() })),
}));

const signGuestCookie = (guestId) => {
  const signed = 's:' + cookieSignature.sign(guestId, 'test-secret');
  return `guest_id=${encodeURIComponent(signed)}`;
};

let mongoServer;
let mongoClient;
let app;

// Simple in-process stores so tests don't rely on the real jsonOptions DB calls
const boxStore = {};
const teamStore = {};

const buildApp = () => {
  const jsonOptions = require('../../Config/jsonOptions');

  jsonOptions.loadMyBoxes = async (userId) => boxStore[userId] ?? [];
  jsonOptions.saveMyBoxes = async (userId, boxes) => { boxStore[userId] = boxes; };
  jsonOptions.loadTeams = async (player, userId) => teamStore[`${player}:${userId}`] ?? {};
  jsonOptions.saveTeams = async (player, userId, teams) => { teamStore[`${player}:${userId}`] = teams; };
  jsonOptions.findTeam = async (player, teamName, userId) => {
    const teams = teamStore[`${player}:${userId}`] ?? {};
    if (!(teamName in teams)) throw new Error(`can't find ${teamName}`);
    return teams[teamName];
  };

  const myBoxControllers = require('../../Controllers/myBoxControllers');
  const teamControllers = require('../../Controllers/teamControllers');

  const application = express();
  application.use(express.json());
  application.use(cookieParser('test-secret'));

  application.use((req, _res, next) => {
    const guestId = req.signedCookies?.guest_id;
    if (guestId) {
      req.userId = guestId;
      req.isGuest = true;
    }
    next();
  });

  const authMiddleware = (req, res, next) => {
    if (!req.userId) return res.status(401).json({ message: 'Authentication required' });
    next();
  };

  application.get('/myBoxes', authMiddleware, myBoxControllers.getAllMyBoxes);
  application.post('/myBoxes', authMiddleware, myBoxControllers.addBox);
  application.post('/myBoxes/:index', authMiddleware, myBoxControllers.addToBox);
  application.delete('/myBoxes/:index/:pokemonName', authMiddleware, myBoxControllers.deleteInBox);

  application.get('/teams/:player', authMiddleware, teamControllers.getAllTeams);
  application.post('/teams/:player', authMiddleware, teamControllers.addTeam);
  application.delete('/teams/:player/:teamName', authMiddleware, teamControllers.removeTeam);
  application.put('/teams/:player/:teamName', authMiddleware, teamControllers.saveFullTeam);

  application.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ message: err.message });
  });

  return application;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  mongoClient = new MongoClient(mongoServer.getUri());
  await mongoClient.connect();
  mockDb.ref = mongoClient.db('test');
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
    expect(res.body.allBoxes).toHaveLength(1);
  });

  test('GET /myBoxes returns 401 without authentication', async () => {
    const res = await request(app).get('/myBoxes');
    expect(res.status).toBe(401);
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
