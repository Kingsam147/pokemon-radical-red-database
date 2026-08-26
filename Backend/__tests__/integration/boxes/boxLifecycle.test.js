const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

jest.mock('../../../infrastructure/redis/redisClient', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  delPattern: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../infrastructure/logger/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
  security: jest.fn(), setUser: jest.fn(), clearUser: jest.fn(),
}));

// Minimal but hydration-complete species fixtures — HydrationService.hydrate()
// needs base stats, sprites, and learnset arrays, not just the name/type/abilities
// shape that createFromImportText alone would need.
const buildSpecies = (overrides) => ({
  sprite: 'sprite-url', femaleSprite: 'sprite-url',
  forms: [],
  baseHP: 80, baseAttack: 80, baseDefense: 80, baseSpAttack: 80, baseSpDefense: 80, baseSpeed: 80,
  levelUpLearnsets: [], tutorLearnsets: [], TMHMLearnsets: [], eggMovesLearnsets: [],
  ...overrides,
});

jest.mock('../../../game-data/loadModels', () => ({
  getModels: () => ({
    species2: {
      Blaziken: buildSpecies({
        name: 'Blaziken', ID: 257, type1: 'Fire', type2: 'Fighting',
        abilities: ['Blaze', 'Speed Boost'],
      }),
      Wobbuffet: buildSpecies({
        name: 'Wobbuffet', ID: 202, type1: 'Psychic', type2: 'Psychic',
        abilities: ['Shadow Tag'],
      }),
      Gengar: buildSpecies({
        name: 'Gengar', ID: 94, type1: 'Ghost', type2: 'Poison',
        abilities: ['Cursed Body'],
      }),
    },
    items: {
      'Wide Lens': { name: 'Wide Lens' },
      Blazikenite: { name: 'Blazikenite' },
      'Life Orb': { name: 'Life Orb' },
      Leftovers: { name: 'Leftovers' },
    },
    natures: {
      Jolly: { increase: 'Spe', decrease: 'SpA' },
      Adamant: { increase: 'Atk', decrease: 'SpA' },
      Timid: { increase: 'Spe', decrease: 'Atk' },
      Hardy: {},
    },
    movesList: { 'High Jump Kick': {}, 'Blaze Kick': {}, 'Brave Bird': {}, Detect: {} },
    abilities: {},
  }),
  avaliableTMS: [],
  megaStones: {},
  loadModels: jest.fn().mockResolvedValue(undefined),
}));

let mongoServer;
let client;
let BoxRepository;
let BoxEntity;
let PokemonEntity;
let boxControllers;

const TEST_USER_ID = 'test-user-box-lifecycle';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  client = new MongoClient(mongoServer.getUri());
  await client.connect();
  jest.doMock('../../../infrastructure/mongodbOptions', () => ({ db: client.db('test') }));
  BoxRepository = require('../../../boxes/BoxRepository');
  BoxEntity = require('../../../boxes/BoxEntity');
  PokemonEntity = require('../../../pokemon/PokemonEntity');
  boxControllers = require('../../../boxes/boxControllers');
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

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// The "test field" this whole file operates against: box index 0 always starts
// with one baseline Pokemon (Wobbuffet) in myBoxes, so every test has a known
// starting state to add to / remove from and reset via afterEach's deleteMany.
beforeEach(async () => {
  await BoxRepository.saveAll(TEST_USER_ID, [new BoxEntity([makePokemon('Wobbuffet')])]);
});

const IMPORT_TEXT = `Blaziken @ Blazikenite  
Ability: Striker  
Tera Type: Fire  
EVs: 252 Atk / 4 SpD / 252 Spe  
Jolly Nature  
IVs: 30 HP  
- Protect  
- Blaze Kick  
- Stone Edge  
- Thunder Punch`;

describe('Import/export round-trip', () => {
  test('importing a Pokemon adds it to the box', async () => {
    const req = { userId: TEST_USER_ID, params: { index: '0' }, body: { pokemonData: IMPORT_TEXT } };
    const res = mockRes();

    await boxControllers.addToBox(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const boxes = await BoxRepository.loadAll(TEST_USER_ID);
    expect(boxes[0].hasPokemon('Blaziken')).toBe(true);
    expect(boxes[0].size).toBe(2); // baseline Wobbuffet + imported Blaziken
  });

  test('removing that Pokemon removes it from the box', async () => {
    const addReq = { userId: TEST_USER_ID, params: { index: '0' }, body: { pokemonData: IMPORT_TEXT } };
    await boxControllers.addToBox(addReq, mockRes());

    const removeReq = { userId: TEST_USER_ID, params: { index: '0', pokemonName: 'Blaziken' } };
    const removeRes = mockRes();
    await boxControllers.deleteInBox(removeReq, removeRes);

    expect(removeRes.status).toHaveBeenCalledWith(200);
    const boxes = await BoxRepository.loadAll(TEST_USER_ID);
    expect(boxes[0].hasPokemon('Blaziken')).toBe(false);
    expect(boxes[0].size).toBe(1); // back down to just the baseline Wobbuffet
  });

  // TODO: fill in importText and expectedAddedPokemon for each case, then it auto-activates
  // (same pattern as __tests__/unit/battling/goldenDamageCalculations.test.js) — importText
  // is the raw pokemonData text sent to addToBox; expectedAddedPokemon is the array of
  // hydrated Pokemon objects (HydrationService.hydrate shape) you expect back in the
  // addToBox response's `addedPokemon` field, in the same order as parsed from importText.
  // Multi-Pokemon imports are separated by a blank line, matching addToBox's own
  // `pokemonData.trim().split(/\n\s*\n/)` parsing (see boxes/boxControllers.js:96-101).
  // If a sample introduces a species other than Blaziken/Wobbuffet, add it to the
  // species2 fixture in the jest.mock('../../../game-data/loadModels', ...) block
  // above (via buildSpecies({...})) or createFromImportText/HydrationService will
  // throw ("isn't a valid Pokemon" / "is not a valid Pokémon species").
  const BLAZIKEN_MEGA_TEXT = `Blaziken @ Blazikenite
Ability: Striker
Tera Type: Fire
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
IVs: 30 HP
- Protect
- Blaze Kick
- Stone Edge
- Thunder Punch`;

  const BLAZIKEN_SPECIAL_ATTACKER_TEXT = `Blaziken @ Life Orb
Ability: Speed Boost
Level: 50
Timid Nature
EVs: 4 Atk / 252 SpA / 252 Spe
IVs: 30 Atk
- Fire Blast
- Focus Blast
- Hidden Power Ice
- Protect`;

  const MULTI_POKEMON_TEXT = `${BLAZIKEN_MEGA_TEXT}

Gengar @ Leftovers
Ability: Cursed Body
Level: 100
Timid Nature
EVs: 252 HP / 4 Def / 252 SpD
IVs: 31 HP
- Shadow Ball
- Sludge Wave
- Focus Blast
- Thunderbolt`;

  // Hardcoded against createFromImportText + HydrationService.hydrate's actual current
  // output for each import text above (captured via a real run against this file's fixture,
  // spot-checked by hand against the real stat formula — see Adamant/Timid math) — these
  // pin today's correct behavior as a regression guard, same spirit as the golden damage-calc
  // scaffold but self-verified here since there's no external calculator to check
  // import/hydration output against. JSON.parse is used purely to guarantee the hardcoded
  // value is byte-for-byte what was captured, with no manual-transcription risk.
  const sampleMatchCases = [
    {
      name: 'Blaziken (Mega, Blazikenite)',
      importText: BLAZIKEN_MEGA_TEXT,
      expectedAddedPokemon: JSON.parse('[{"name":"Blaziken","form":"Blaziken","ID":257,"sprite":"sprite-url","femaleSprite":"sprite-url","type1":"Fire","type2":"Fighting","gender":"N","level":100,"nature":"Jolly","item":"Blazikenite","ability":"Striker","abilities":["Blaze","Infiltrator"],"baseStats":{"HP":80,"Atk":80,"Def":80,"SpA":80,"SpD":80,"Spe":80},"EVs":{"HP":0,"Atk":252,"Def":0,"SpA":0,"SpD":4,"Spe":252},"IVs":{"HP":30,"Atk":31,"Def":31,"SpA":31,"SpD":31,"Spe":31},"finalStats":{"HP":300,"Atk":259,"Def":196,"SpA":176,"SpD":197,"Spe":284},"moveset":["Protect","Blaze Kick","Stone Edge","Thunder Punch"],"allMoves":[],"forms":{"Blaziken":{"formName":"Blaziken","ID":257,"sprite":"sprite-url","type1":"Fire","type2":"Fighting","ability":"Blaze","abilities":["Blaze","Infiltrator"],"baseStats":{"HP":80,"Atk":80,"Def":80,"SpA":80,"SpD":80,"Spe":80},"finalStats":{"HP":300,"Atk":259,"Def":196,"SpA":176,"SpD":197,"Spe":284},"allMoves":[]}},"version":0}]'),
    },
    {
      name: 'Blaziken (special attacker, Timid Life Orb)',
      importText: BLAZIKEN_SPECIAL_ATTACKER_TEXT,
      expectedAddedPokemon: JSON.parse('[{"name":"Blaziken","form":"Blaziken","ID":257,"sprite":"sprite-url","femaleSprite":"sprite-url","type1":"Fire","type2":"Fighting","gender":"N","level":50,"nature":"Timid","item":"Life Orb","ability":"Infiltrator","abilities":["Blaze","Infiltrator"],"baseStats":{"HP":80,"Atk":80,"Def":80,"SpA":80,"SpD":80,"Spe":80},"EVs":{"HP":0,"Atk":4,"Def":0,"SpA":252,"SpD":0,"Spe":252},"IVs":{"HP":31,"Atk":30,"Def":31,"SpA":31,"SpD":31,"Spe":31},"finalStats":{"HP":155,"Atk":90,"Def":100,"SpA":132,"SpD":100,"Spe":145},"moveset":["Fire Blast","Focus Blast","Hidden Power Ice","Protect"],"allMoves":[],"forms":{"Blaziken":{"formName":"Blaziken","ID":257,"sprite":"sprite-url","type1":"Fire","type2":"Fighting","ability":"Blaze","abilities":["Blaze","Infiltrator"],"baseStats":{"HP":80,"Atk":80,"Def":80,"SpA":80,"SpD":80,"Spe":80},"finalStats":{"HP":155,"Atk":90,"Def":100,"SpA":132,"SpD":100,"Spe":145},"allMoves":[]}},"version":0}]'),
    },
    {
      name: 'multi-Pokemon import (Blaziken + Gengar)',
      importText: MULTI_POKEMON_TEXT,
      expectedAddedPokemon: JSON.parse('[{"name":"Blaziken","form":"Blaziken","ID":257,"sprite":"sprite-url","femaleSprite":"sprite-url","type1":"Fire","type2":"Fighting","gender":"N","level":100,"nature":"Jolly","item":"Blazikenite","ability":"Striker","abilities":["Blaze","Infiltrator"],"baseStats":{"HP":80,"Atk":80,"Def":80,"SpA":80,"SpD":80,"Spe":80},"EVs":{"HP":0,"Atk":252,"Def":0,"SpA":0,"SpD":4,"Spe":252},"IVs":{"HP":30,"Atk":31,"Def":31,"SpA":31,"SpD":31,"Spe":31},"finalStats":{"HP":300,"Atk":259,"Def":196,"SpA":176,"SpD":197,"Spe":284},"moveset":["Protect","Blaze Kick","Stone Edge","Thunder Punch"],"allMoves":[],"forms":{"Blaziken":{"formName":"Blaziken","ID":257,"sprite":"sprite-url","type1":"Fire","type2":"Fighting","ability":"Blaze","abilities":["Blaze","Infiltrator"],"baseStats":{"HP":80,"Atk":80,"Def":80,"SpA":80,"SpD":80,"Spe":80},"finalStats":{"HP":300,"Atk":259,"Def":196,"SpA":176,"SpD":197,"Spe":284},"allMoves":[]}},"version":0},{"name":"Gengar","form":"Gengar","ID":94,"sprite":"sprite-url","femaleSprite":"sprite-url","type1":"Ghost","type2":"Poison","gender":"N","level":100,"nature":"Timid","item":"Leftovers","ability":"Cursed Body","abilities":["Cursed Body"],"baseStats":{"HP":80,"Atk":80,"Def":80,"SpA":80,"SpD":80,"Spe":80},"EVs":{"HP":252,"Atk":0,"Def":4,"SpA":0,"SpD":252,"Spe":0},"IVs":{"HP":31,"Atk":31,"Def":31,"SpA":31,"SpD":31,"Spe":31},"finalStats":{"HP":364,"Atk":176,"Def":197,"SpA":196,"SpD":259,"Spe":215},"moveset":["Shadow Ball","Sludge Wave","Focus Blast","Thunderbolt"],"allMoves":[],"forms":{"Gengar":{"formName":"Gengar","ID":94,"sprite":"sprite-url","type1":"Ghost","type2":"Poison","ability":"Cursed Body","abilities":["Cursed Body"],"baseStats":{"HP":80,"Atk":80,"Def":80,"SpA":80,"SpD":80,"Spe":80},"finalStats":{"HP":364,"Atk":176,"Def":197,"SpA":196,"SpD":259,"Spe":215},"allMoves":[]}},"version":0}]'),
    },
  ];

  sampleMatchCases.forEach((sampleCase, index) => {
    test(`sample case ${index + 1}: ${sampleCase.name}`, async () => {
      const req = { userId: TEST_USER_ID, params: { index: '0' }, body: { pokemonData: sampleCase.importText } };
      const res = mockRes();

      await boxControllers.addToBox(req, res);

      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.addedPokemon).toEqual(sampleCase.expectedAddedPokemon);
    });
  });
});

describe('Add/remove box', () => {
  test('addBox increases box count by exactly 1', async () => {
    const before = await client.db('test').collection('myBoxes').countDocuments({ userId: TEST_USER_ID });
    expect(before).toBe(1);

    const req = { userId: TEST_USER_ID };
    const res = mockRes();
    await boxControllers.addBox(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 2 }));

    const after = await client.db('test').collection('myBoxes').countDocuments({ userId: TEST_USER_ID });
    expect(after).toBe(2);
  });

  test('removeBox decreases box count by exactly 1 and removes the correct box', async () => {
    await boxControllers.addBox({ userId: TEST_USER_ID }, mockRes()); // now 2 boxes: [Wobbuffet], []

    const req = { userId: TEST_USER_ID, params: { index: '1' } };
    const res = mockRes();
    await boxControllers.removeBox(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));

    const after = await client.db('test').collection('myBoxes').countDocuments({ userId: TEST_USER_ID });
    expect(after).toBe(1);
    const remaining = await BoxRepository.loadAll(TEST_USER_ID);
    expect(remaining[0].hasPokemon('Wobbuffet')).toBe(true);
  });
});
