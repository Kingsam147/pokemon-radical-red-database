jest.mock('../../../infrastructure/redis/redisClient', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

jest.mock('../../../teams/TeamRepository', () => ({
  loadAllTeams: jest.fn(),
}));

const redis = require('../../../infrastructure/redis/redisClient');
const TeamRepository = require('../../../teams/TeamRepository');
const {
  getHydratedEnemyPreview,
  invalidateEnemyPreview,
  ENEMY_PREVIEW_KEY,
} = require('../../../enemy-preview/enemyPreviewService');

// buildEnemyPreview no longer hydrates whatever team is first in the enemy
// collection — it always serves a hand-hardcoded, fully-resolved Bulbasaur
// (see the HARDCODED_BULBASAUR comment in enemyPreviewService.js). Only the
// teamName label is still derived live from TeamRepository, so the trainer
// name shown alongside the preview stays accurate even though the Pokemon
// itself is static scaffolding.
const asStoredTeam = (rawDoc) => ({ toJSON: () => rawDoc });

describe('enemyPreviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  test('serves the hardcoded, fully-resolved Bulbasaur regardless of the actual first team contents', async () => {
    redis.get.mockResolvedValue(null);
    TeamRepository.loadAllTeams.mockResolvedValue({
      'Gym Leader Brock': asStoredTeam({ Onix: { name: 'Onix' } }),
    });

    const result = await getHydratedEnemyPreview();

    expect(result.teamName).toBe('Gym Leader Brock');
    expect(result.team.Bulbasaur.name).toBe('Bulbasaur');
    expect(result.team.Bulbasaur.ID).toBe(1);
    expect(result.team.Bulbasaur.ability).toEqual({
      name: 'Overgrow',
      description: '',
      toggle: false,
    });
    expect(result.team.Bulbasaur.type1).toMatchObject({ name: 'Grass' });
    expect(result.team.Bulbasaur.type2).toMatchObject({ name: 'Poison' });
    expect(result.team.Bulbasaur.finalStats).toEqual({
      HP: 21,
      Atk: 11,
      Def: 11,
      SpA: 13,
      SpD: 13,
      Spe: 11,
    });
    expect(result.team.Bulbasaur.moveset.map((m) => m.name)).toEqual([
      'Tackle',
      'Growl',
    ]);
    expect(result.team.Bulbasaur.forms.Bulbasaur.formName).toBe('Bulbasaur');
  });

  test('Bulbasaur sprite is the S3 pokemon/{ID}.png convention, not a third-party URL', async () => {
    redis.get.mockResolvedValue(null);
    TeamRepository.loadAllTeams.mockResolvedValue({
      Team1: asStoredTeam({ Bulbasaur: { name: 'Bulbasaur' } }),
    });

    const result = await getHydratedEnemyPreview();

    expect(result.team.Bulbasaur.sprite).toBe('https://pokemon-radical-red.s3.us-east-2.amazonaws.com/pokemon/1.png');
    expect(result.team.Bulbasaur.forms.Bulbasaur.sprite).toBe(result.team.Bulbasaur.sprite);
  });

  test('labels the preview with the live first enemy trainer name', async () => {
    redis.get.mockResolvedValue(null);
    TeamRepository.loadAllTeams.mockResolvedValue({
      'Rival Gary - Pallet Town (Bulbasaur)': asStoredTeam({
        Bulbasaur: { name: 'Bulbasaur' },
      }),
    });

    const result = await getHydratedEnemyPreview();

    expect(result.team.trainerInfo.name).toBe(
      'Rival Gary - Pallet Town (Bulbasaur)',
    );
  });

  test('resolves a raw array team (per Assumption #3) without throwing', async () => {
    redis.get.mockResolvedValue(null);
    TeamRepository.loadAllTeams.mockResolvedValue({
      LegacyTeam: [{ name: 'Ditto' }],
    });

    const result = await getHydratedEnemyPreview();

    expect(result.teamName).toBe('LegacyTeam');
    expect(result.team.Bulbasaur.name).toBe('Bulbasaur');
  });

  test('serves from Redis cache without touching TeamRepository when a cached value exists', async () => {
    const cached = { teamName: 'Cached Trainer', team: {} };
    redis.get.mockResolvedValue(cached);

    const result = await getHydratedEnemyPreview();

    expect(result).toBe(cached);
    expect(TeamRepository.loadAllTeams).not.toHaveBeenCalled();
  });

  test('writes the preview to Redis under the expected key on a cache miss', async () => {
    redis.get.mockResolvedValue(null);
    TeamRepository.loadAllTeams.mockResolvedValue({
      Team1: asStoredTeam({ Bulbasaur: { name: 'Bulbasaur' } }),
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
