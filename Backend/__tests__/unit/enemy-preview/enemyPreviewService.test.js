jest.mock('../../../infrastructure/redis/redisClient', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

jest.mock('../../../teams/TeamRepository', () => ({
  loadAllTeams: jest.fn(),
}));

jest.mock('../../../game-data/loadModels', () => ({
  getModels: jest.fn(),
}));

const redis = require('../../../infrastructure/redis/redisClient');
const TeamRepository = require('../../../teams/TeamRepository');
const { getModels } = require('../../../game-data/loadModels');
const {
  getHydratedEnemyPreview,
  invalidateEnemyPreview,
  ENEMY_PREVIEW_KEY,
} = require('../../../enemy-preview/enemyPreviewService');

const models = {
  abilities: {
    intimidate: {
      name: 'Intimidate',
      description: 'Lowers foe Atk',
      toggle: false,
    },
  },
  items: { leftovers: { name: 'Leftovers' } },
  natures: { adamant: { name: 'Adamant', increase: 'Atk', decrease: 'SpA' } },
  movesList: {
    tackle: { name: 'Tackle', type: 'Normal', category: 'Physical' },
  },
  typeChart: { normal: { name: 'Normal' } },
};

const rawTeam = {
  trainerInfo: { format: 'Singles' },
  1: {
    name: 'Snorlax',
    ID: '143',
    item: 'leftovers',
    ability: 'intimidate',
    abilities: ['intimidate'],
    nature: 'adamant',
    type1: 'normal',
    type2: 'normal',
    moveset: ['tackle'],
    allMoves: ['tackle'],
    form: null,
    forms: {
      Snorlax: {
        formName: 'Snorlax',
        ID: 143,
        baseStats: {},
        finalStats: {},
        ability: 'intimidate',
        abilities: ['intimidate'],
        allMoves: ['tackle'],
        type1: 'normal',
        type2: 'normal',
      },
    },
    statBoosts: null,
  },
};

// TeamRepository.loadAllTeams resolves TeamEntity instances (or raw arrays
// per Assumption #3), never plain dicts — buildEnemyPreview only ever calls
// .toJSON() on the resolved value, so a minimal duck-typed stub is sufficient.
const asStoredTeam = (rawDoc) => ({ toJSON: () => rawDoc });

describe('enemyPreviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getModels.mockReturnValue(models);
  });

  test('returns null when there are no enemy teams', async () => {
    redis.get.mockResolvedValue(null);
    TeamRepository.loadAllTeams.mockResolvedValue({});

    const result = await getHydratedEnemyPreview();

    expect(result).toBeNull();
  });

  test('calls TeamRepository.loadAllTeams(2, null) — the enemy-team collection, unscoped', async () => {
    redis.get.mockResolvedValue(null);
    TeamRepository.loadAllTeams.mockResolvedValue({});

    await getHydratedEnemyPreview();

    expect(TeamRepository.loadAllTeams).toHaveBeenCalledWith(2, null);
  });

  test('hydrates every string reference into the full resolved object', async () => {
    redis.get.mockResolvedValue(null);
    TeamRepository.loadAllTeams.mockResolvedValue({
      'Gym Leader Brock': asStoredTeam(rawTeam),
    });

    const result = await getHydratedEnemyPreview();

    expect(result.teamName).toBe('Gym Leader Brock');
    expect(result.team[1].item).toEqual(models.items.leftovers);
    expect(result.team[1].ability).toEqual(models.abilities.intimidate);
    expect(result.team[1].abilities).toEqual([models.abilities.intimidate]);
    expect(result.team[1].nature).toEqual(models.natures.adamant);
    expect(result.team[1].type1).toEqual(models.typeChart.normal);
    expect(result.team[1].type2).toEqual(models.typeChart.normal);
    expect(result.team[1].moveset).toEqual([models.movesList.tackle]);
    expect(result.team[1].allMoves).toEqual([models.movesList.tackle]);
    expect(result.team[1].forms.Snorlax.ability).toEqual(
      models.abilities.intimidate,
    );
    expect(result.team.trainerInfo).toEqual({ format: 'Singles' });
  });

  test('falls back to a name-only move object when a move is missing from the database', async () => {
    redis.get.mockResolvedValue(null);
    TeamRepository.loadAllTeams.mockResolvedValue({
      Team1: asStoredTeam({
        1: {
          ...rawTeam[1],
          moveset: ['nonexistentmove'],
          allMoves: ['nonexistentmove'],
        },
      }),
    });

    const result = await getHydratedEnemyPreview();

    expect(result.team[1].moveset).toEqual([{ name: 'nonexistentmove' }]);
  });

  test('defaults missing statBoosts to zero for every stat', async () => {
    redis.get.mockResolvedValue(null);
    TeamRepository.loadAllTeams.mockResolvedValue({
      Team1: asStoredTeam(rawTeam),
    });

    const result = await getHydratedEnemyPreview();

    expect(result.team[1].statBoosts).toEqual({
      Atk: 0,
      Def: 0,
      SpA: 0,
      SpD: 0,
      Spe: 0,
    });
  });

  test('resolves a raw array team (per Assumption #3) without throwing', async () => {
    redis.get.mockResolvedValue(null);
    TeamRepository.loadAllTeams.mockResolvedValue({
      LegacyTeam: [{ name: 'Ditto' }],
    });

    const result = await getHydratedEnemyPreview();

    // The outer team is a plain array (not a TeamEntity), so buildEnemyPreview
    // skips .toJSON() and passes it straight to resolveTeamSlots — which still
    // walks and resolves each slot's Pokemon fields, same as for a dict-shaped
    // team. Object.entries() on an array yields index-keyed entries.
    expect(result.teamName).toBe('LegacyTeam');
    expect(result.team['0'].name).toBe('Ditto');
  });

  test('serves from Redis cache without touching TeamRepository when a cached value exists', async () => {
    const cached = { teamName: 'Cached Trainer', team: {} };
    redis.get.mockResolvedValue(cached);

    const result = await getHydratedEnemyPreview();

    expect(result).toBe(cached);
    expect(TeamRepository.loadAllTeams).not.toHaveBeenCalled();
  });

  test('writes the hydrated result to Redis under the expected key on a cache miss', async () => {
    redis.get.mockResolvedValue(null);
    TeamRepository.loadAllTeams.mockResolvedValue({
      Team1: asStoredTeam(rawTeam),
    });

    await getHydratedEnemyPreview();

    expect(redis.set).toHaveBeenCalledWith(
      ENEMY_PREVIEW_KEY,
      expect.objectContaining({ teamName: 'Team1' }),
      86400,
    );
  });

  test('invalidateEnemyPreview deletes the cache key', async () => {
    await invalidateEnemyPreview();

    expect(redis.del).toHaveBeenCalledWith(ENEMY_PREVIEW_KEY);
  });
});
