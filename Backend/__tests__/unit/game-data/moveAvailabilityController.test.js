// "Evolved" evolves from "Basic" (level 16). Both share one level-up move and one TM move
// at the same names, to verify uniqueness dedup; "Basic" also has moves Evolved doesn't.
const species2 = {
  Basic: {
    name: 'Basic',
    levelUpLearnsets: [
      ['Pre Evo Low Level Move', 5],
      ['Pre Evo High Level Move', 60],
      ['Shared Level Move', 20],
    ],
    TMHMLearnsets: ['Pre Evo TM Move', 'Shared TM Move'],
    tutorLearnsets: ['Pre Evo Tutor Move'],
    eggMovesLearnsets: [],
    evolution: [['EVO_LEVEL', '16', 'Evolved']],
  },
  Evolved: {
    name: 'Evolved',
    levelUpLearnsets: [
      ['Own Level Move', 10],
      ['Shared Level Move', 20],
    ],
    TMHMLearnsets: ['Shared TM Move'],
    tutorLearnsets: [],
    eggMovesLearnsets: [],
    evolution: [],
  },
};

const movesList = {};
[
  'Pre Evo Low Level Move', 'Pre Evo High Level Move', 'Shared Level Move',
  'Pre Evo TM Move', 'Shared TM Move', 'Pre Evo Tutor Move', 'Own Level Move',
].forEach((name) => { movesList[name] = { name, type: 'Normal', category: 'Physical' }; });

jest.mock('../../../game-data/loadModels', () => ({
  getModels: () => ({ species2, movesList, abilities: {} }),
}));

jest.mock('../../../game-data/jsOptions', () => ({
  isEggMoves: false,
  tutorTable: { 0: ['Pre Evo Tutor Move'] },
  bannedMoves: [],
  leechSeedExceptions: [],
  toxicExceptions: [],
}));

// Real TM/HM whitelist doesn't include this fixture's fictional move names --
// stub it as an identity passthrough so the controller's own merge logic is what's tested.
jest.mock('../../../game-data/tmHmList', () => ({
  resolveCheckedTMNames: (checkedTMs) => (Array.isArray(checkedTMs) ? checkedTMs : []),
}));

const HydrationService = require('../../../pokemon/HydrationService');
HydrationService.load();

const { getMoveAvailability } = require('../../../game-data/moveAvailabilityController');
const { resetPreEvolutionCache } = require('../../../game-data/preEvolution');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('getMoveAvailability', () => {
  beforeEach(() => resetPreEvolutionCache());

  test('400s on an invalid species', () => {
    const req = { body: { species: 'NotReal', form: 'NotReal', level: 30, checkedTMs: [], tutorTier: null } };
    const res = mockRes();
    getMoveAvailability(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('400s on an out-of-range level', () => {
    const req = { body: { species: 'Evolved', form: 'Evolved', level: 0, checkedTMs: [], tutorTier: null } };
    const res = mockRes();
    getMoveAvailability(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('includes the Pokemon\'s own level/TM/tutor pool, unflagged', () => {
    const req = {
      body: { species: 'Evolved', form: 'Evolved', level: 30, checkedTMs: ['Shared TM Move'], tutorTier: null },
    };
    const res = mockRes();
    getMoveAvailability(req, res);
    const { allMoves } = res.json.mock.calls[0][0];
    const ownMove = allMoves.find((m) => m.name === 'Own Level Move');
    expect(ownMove).toBeDefined();
    expect(ownMove.fromPreEvolution).toBe(false);
  });

  test('inherits a pre-evolution level-up move the Pokemon\'s current level clears, flagged fromPreEvolution', () => {
    const req = {
      body: { species: 'Evolved', form: 'Evolved', level: 30, checkedTMs: [], tutorTier: null },
    };
    const res = mockRes();
    getMoveAvailability(req, res);
    const { allMoves } = res.json.mock.calls[0][0];
    const inherited = allMoves.find((m) => m.name === 'Pre Evo Low Level Move');
    expect(inherited).toBeDefined();
    expect(inherited.fromPreEvolution).toBe(true);
  });

  test('excludes a pre-evolution level-up move the current level has not reached', () => {
    const req = {
      body: { species: 'Evolved', form: 'Evolved', level: 30, checkedTMs: [], tutorTier: null },
    };
    const res = mockRes();
    getMoveAvailability(req, res);
    const { allMoves } = res.json.mock.calls[0][0];
    expect(allMoves.find((m) => m.name === 'Pre Evo High Level Move')).toBeUndefined();
  });

  test('a move shared by both species is not duplicated or marked fromPreEvolution', () => {
    const req = {
      body: { species: 'Evolved', form: 'Evolved', level: 30, checkedTMs: ['Shared TM Move'], tutorTier: null },
    };
    const res = mockRes();
    getMoveAvailability(req, res);
    const { allMoves } = res.json.mock.calls[0][0];
    const sharedLevelMatches = allMoves.filter((m) => m.name === 'Shared Level Move');
    expect(sharedLevelMatches).toHaveLength(1);
    expect(sharedLevelMatches[0].fromPreEvolution).toBe(false);
  });

  test('inherits a pre-evolution TM move only when it is checked, flagged fromPreEvolution', () => {
    const withoutTM = mockRes();
    getMoveAvailability(
      { body: { species: 'Evolved', form: 'Evolved', level: 30, checkedTMs: [], tutorTier: null } },
      withoutTM,
    );
    expect(withoutTM.json.mock.calls[0][0].allMoves.find((m) => m.name === 'Pre Evo TM Move')).toBeUndefined();

    const withTM = mockRes();
    getMoveAvailability(
      { body: { species: 'Evolved', form: 'Evolved', level: 30, checkedTMs: ['Pre Evo TM Move'], tutorTier: null } },
      withTM,
    );
    const inherited = withTM.json.mock.calls[0][0].allMoves.find((m) => m.name === 'Pre Evo TM Move');
    expect(inherited).toBeDefined();
    expect(inherited.fromPreEvolution).toBe(true);
  });

  test('inherits a pre-evolution tutor move only at a tier that includes it', () => {
    const noTier = mockRes();
    getMoveAvailability(
      { body: { species: 'Evolved', form: 'Evolved', level: 30, checkedTMs: [], tutorTier: null } },
      noTier,
    );
    expect(noTier.json.mock.calls[0][0].allMoves.find((m) => m.name === 'Pre Evo Tutor Move')).toBeUndefined();

    const tier0 = mockRes();
    getMoveAvailability(
      { body: { species: 'Evolved', form: 'Evolved', level: 30, checkedTMs: [], tutorTier: 0 } },
      tier0,
    );
    const inherited = tier0.json.mock.calls[0][0].allMoves.find((m) => m.name === 'Pre Evo Tutor Move');
    expect(inherited).toBeDefined();
    expect(inherited.fromPreEvolution).toBe(true);
  });

  test('an invalid tutorTier falls back to no tutor moves instead of throwing', () => {
    const req = {
      body: { species: 'Evolved', form: 'Evolved', level: 30, checkedTMs: [], tutorTier: 99 },
    };
    const res = mockRes();
    expect(() => getMoveAvailability(req, res)).not.toThrow();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
