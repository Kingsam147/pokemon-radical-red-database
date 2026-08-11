const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

jest.mock('../../../infrastructure/redis/redisClient', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  delPattern: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../game-data/loadModels', () => ({
  getModels: () => ({ natures: {}, items: {} }),
}));

let mongoServer;
let client;
let BoxRepository;
let BoxEntity;
let PokemonEntity;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  client = new MongoClient(mongoServer.getUri());
  await client.connect();
  jest.doMock('../../../Config/mongodbOptions', () => ({ db: client.db('test') }));
  BoxRepository = require('../../../boxes/BoxRepository');
  BoxEntity = require('../../../boxes/BoxEntity');
  PokemonEntity = require('../../../pokemon/PokemonEntity');
});

afterAll(async () => {
  await client.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await client.db('test').collection('myBoxes').deleteMany({});
});

const makePokemon = (name) =>
  PokemonEntity.create({
    name, form: name, gender: 'N', level: 50, nature: 'Hardy', item: '',
    ability_id: 'Levitate', move_ids: [],
    EVs: { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
    IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
    player: 1,
  });

describe('BoxRepository', () => {
  test('loadAll returns [] for a user with no boxes', async () => {
    const boxes = await BoxRepository.loadAll('user-1');
    expect(boxes).toEqual([]);
  });

  test('saveAll then loadAll round-trips box contents', async () => {
    const box = new BoxEntity([makePokemon('Ditto')]);
    await BoxRepository.saveAll('user-1', [box]);
    const loaded = await BoxRepository.loadAll('user-1');
    expect(loaded).toHaveLength(1);
    expect(loaded[0].hasPokemon('Ditto')).toBe(true);
  });

  test('saveAll scopes boxes to userId — another user sees none', async () => {
    await BoxRepository.saveAll('user-1', [new BoxEntity([makePokemon('Ditto')])]);
    const otherUsersBoxes = await BoxRepository.loadAll('user-2');
    expect(otherUsersBoxes).toEqual([]);
  });

  test('loadOne returns undefined for an out-of-range index', async () => {
    await BoxRepository.saveAll('user-1', [new BoxEntity([])]);
    expect(await BoxRepository.loadOne('user-1', 5)).toBeUndefined();
  });

  test('reassignOwner moves all boxes from one userId to another', async () => {
    await BoxRepository.saveAll('guest-1', [new BoxEntity([makePokemon('Ditto')])]);
    const modifiedCount = await BoxRepository.reassignOwner('guest-1', 'auth-user-1');
    expect(modifiedCount).toBe(1);
    expect(await BoxRepository.loadAll('guest-1')).toEqual([]);
    expect((await BoxRepository.loadAll('auth-user-1'))[0].hasPokemon('Ditto')).toBe(true);
  });
});
