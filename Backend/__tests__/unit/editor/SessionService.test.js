jest.mock('../../../editor/SessionStore');
jest.mock('../../../teams/TeamRepository');
jest.mock('../../../pokemon/HydrationService');

const SessionStore = require('../../../editor/SessionStore');
const TeamRepository = require('../../../teams/TeamRepository');
const TeamEntity = require('../../../teams/TeamEntity');
const PokemonEntity = require('../../../pokemon/PokemonEntity');
const SessionService = require('../../../editor/SessionService');

const makePokemon = (overrides = {}) =>
  PokemonEntity.create({
    name: 'Ditto', form: 'Ditto', gender: 'N', level: 50, nature: 'Hardy', item: '',
    ability_id: 'Limber', move_ids: [],
    EVs: { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
    IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
    player: 1,
    ...overrides,
  });

beforeEach(() => jest.clearAllMocks());

describe('SessionService.activate', () => {
  test('loads the stored Pokemon from the team and stores it as the draft', async () => {
    const team = new TeamEntity([makePokemon()]);
    TeamRepository.findTeam.mockResolvedValue(team);

    await SessionService.activate('user-1', 'session-1', {
      player: 1, teamName: 'Main', pokemonName: 'Ditto',
    });

    expect(SessionStore.set).toHaveBeenCalledWith('user-1', 'session-1', expect.any(PokemonEntity));
  });

  test('throws when the Pokemon is not in the team', async () => {
    TeamRepository.findTeam.mockResolvedValue(new TeamEntity([]));
    await expect(
      SessionService.activate('user-1', 'session-1', { player: 1, teamName: 'Main', pokemonName: 'Missingno' }),
    ).rejects.toThrow('Missingno not found in team "Main"');
  });
});

describe('SessionService.patchDraft', () => {
  test('applies whitelisted changes onto the draft in place', () => {
    const entity = makePokemon();
    SessionStore.has.mockReturnValue(true);
    SessionStore.get.mockReturnValue(entity);

    SessionService.patchDraft('user-1', 'session-1', { level: 75 });

    expect(entity.level).toBe(75);
    expect(SessionStore.set).toHaveBeenCalledWith('user-1', 'session-1', entity);
  });

  test('throws when there is no active draft', () => {
    SessionStore.has.mockReturnValue(false);
    expect(() => SessionService.patchDraft('user-1', 'session-1', { level: 75 })).toThrow(
      'No active draft for session "session-1"',
    );
  });
});

describe('SessionService.removeDraft', () => {
  test('delegates to SessionStore.remove', () => {
    SessionService.removeDraft('user-1', 'session-1');
    expect(SessionStore.remove).toHaveBeenCalledWith('user-1', 'session-1');
  });
});
