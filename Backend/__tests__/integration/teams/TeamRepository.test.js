const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

jest.mock('../../../infrastructure/redis/redisClient', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../game-data/loadModels', () => ({
  getModels: () => ({ natures: {}, items: {} }),
}));

let mongoServer;
let client;
let TeamRepository;
let TeamEntity;
let PokemonEntity;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  client = new MongoClient(mongoServer.getUri());
  await client.connect();
  jest.doMock('../../../Config/mongodbOptions', () => ({ db: client.db('test') }));
  TeamRepository = require('../../../teams/TeamRepository');
  TeamEntity = require('../../../teams/TeamEntity');
  PokemonEntity = require('../../../pokemon/PokemonEntity');
});

afterAll(async () => {
  await client.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await client.db('test').collection('myTeamSets').deleteMany({});
  await client.db('test').collection('enemyTeamSets').deleteMany({});
});

const makePokemon = (name, overrides = {}) =>
  PokemonEntity.create({
    name, form: name, gender: 'N', level: 50, nature: 'Hardy', item: '',
    ability_id: 'Levitate', move_ids: [],
    EVs: { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
    IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
    player: 1,
    ...overrides,
  });

describe('TeamRepository team CRUD', () => {
  test('addTeam creates an empty TeamEntity, findTeam retrieves it', async () => {
    await TeamRepository.addTeam(1, 'user-1', 'Main');
    const team = await TeamRepository.findTeam(1, 'Main', 'user-1');
    expect(team.size).toBe(0);
  });

  test('addTeam throws when the team name already exists', async () => {
    await TeamRepository.addTeam(1, 'user-1', 'Main');
    await expect(TeamRepository.addTeam(1, 'user-1', 'Main')).rejects.toThrow(
      'Main already exists in my box',
    );
  });

  test('findTeam throws when the team does not exist', async () => {
    await expect(TeamRepository.findTeam(1, 'Nope', 'user-1')).rejects.toThrow(
      "can't find Nope among my teams",
    );
  });

  test('removeTeam deletes the team', async () => {
    await TeamRepository.addTeam(1, 'user-1', 'Main');
    await TeamRepository.removeTeam(1, 'user-1', 'Main');
    await expect(TeamRepository.findTeam(1, 'Main', 'user-1')).rejects.toThrow(
      "can't find Main among my teams",
    );
  });

  test('removeAllTeams clears every team for that player/user', async () => {
    await TeamRepository.addTeam(1, 'user-1', 'Main');
    await TeamRepository.removeAllTeams(1, 'user-1');
    const teams = await TeamRepository.loadAllTeams(1, 'user-1');
    expect(teams).toEqual({});
  });

  test('replaceTeamContents stores a raw array, preserved as-is on read', async () => {
    await TeamRepository.addTeam(1, 'user-1', 'Main');
    await TeamRepository.replaceTeamContents(1, 'user-1', 'Main', [{ name: 'Ditto' }]);
    const teams = await TeamRepository.loadAllTeams(1, 'user-1');
    expect(Array.isArray(teams.Main)).toBe(true);
    expect(teams.Main).toEqual([{ name: 'Ditto' }]);
  });
});

describe('TeamRepository.savePokemon', () => {
  test('adds a new pokemon into an existing team at version 1', async () => {
    await TeamRepository.addTeam(1, 'user-1', 'Main');
    const entity = makePokemon('Ditto');
    const saved = await TeamRepository.savePokemon(entity, 'Main', 'Ditto', 'user-1');
    expect(saved.version).toBe(1);
    const team = await TeamRepository.findTeam(1, 'Main', 'user-1');
    expect(team.getPokemon('Ditto').version).toBe(1);
  });

  test('rejects saving a Pokemon owned by a different user', async () => {
    await TeamRepository.addTeam(1, 'user-1', 'Main');
    const entity = makePokemon('Ditto', { userId: 'someone-else' });
    await expect(
      TeamRepository.savePokemon(entity, 'Main', 'Ditto', 'user-1'),
    ).rejects.toMatchObject({ status: 403 });
  });

  test('throws 409 on a stale version conflict', async () => {
    await TeamRepository.addTeam(1, 'user-1', 'Main');
    const first = makePokemon('Ditto');
    await TeamRepository.savePokemon(first, 'Main', 'Ditto', 'user-1');
    // Saving the same starting version again should now conflict with the v1 already stored.
    const staleAttempt = makePokemon('Ditto');
    await expect(
      TeamRepository.savePokemon(staleAttempt, 'Main', 'Ditto', 'user-1'),
    ).rejects.toMatchObject({ status: 409 });
  });

  test('throws when the team does not exist', async () => {
    const entity = makePokemon('Ditto');
    await expect(
      TeamRepository.savePokemon(entity, 'Nonexistent', 'Ditto', 'user-1'),
    ).rejects.toThrow('Team "Nonexistent" not found');
  });
});

describe('TeamRepository.reassignOwner', () => {
  test('moves all myTeamSets documents from one userId to another', async () => {
    await TeamRepository.addTeam(1, 'guest-1', 'Main');
    const modifiedCount = await TeamRepository.reassignOwner('guest-1', 'auth-user-1');
    expect(modifiedCount).toBe(1);
    await expect(TeamRepository.findTeam(1, 'Main', 'guest-1')).rejects.toThrow();
    const team = await TeamRepository.findTeam(1, 'Main', 'auth-user-1');
    expect(team.size).toBe(0);
  });
});
