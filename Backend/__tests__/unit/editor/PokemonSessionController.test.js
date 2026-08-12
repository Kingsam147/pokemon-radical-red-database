jest.mock('../../../editor/SessionService');
jest.mock('../../../teams/TeamRepository');
jest.mock('../../../Domain/pokemon/CalculationDomainService');

const SessionService = require('../../../editor/SessionService');
const TeamRepository = require('../../../teams/TeamRepository');
const { validate } = require('../../../Domain/pokemon/CalculationDomainService');
const { saveDraft } = require('../../../editor/PokemonSessionController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (overrides = {}) => ({
  auth: { payload: { sub: 'u1' } },
  params: { sessionId: 'session-1' },
  body: { teamName: 'Main', pokemonName: 'Ditto' },
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

describe('PokemonSessionController.saveDraft', () => {
  test('returns 404, not 500, when TeamRepository.savePokemon reports the target team was not found', async () => {
    const entity = { name: 'Ditto', player: 1, version: 0 };
    SessionService.getDraftEntity.mockReturnValue(entity);
    validate.mockReturnValue({ valid: true, errors: [] });
    TeamRepository.savePokemon.mockRejectedValue(new Error('Team "Main" not found'));

    const req = makeReq();
    const res = mockRes();
    await saveDraft(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Team "Main" not found' });
    expect(SessionService.removeDraft).not.toHaveBeenCalled();
  });

  test('saves the draft and returns 200 on success', async () => {
    const entity = { name: 'Ditto', player: 1, version: 0 };
    SessionService.getDraftEntity.mockReturnValue(entity);
    validate.mockReturnValue({ valid: true, errors: [] });
    TeamRepository.savePokemon.mockResolvedValue({ ...entity, version: 1 });

    const req = makeReq();
    const res = mockRes();
    await saveDraft(req, res);

    expect(TeamRepository.savePokemon).toHaveBeenCalledWith(entity, 'Main', 'Ditto', 'u1');
    expect(SessionService.removeDraft).toHaveBeenCalledWith('u1', 'session-1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 403 when TeamRepository.savePokemon reports a forbidden ownership mismatch', async () => {
    const entity = { name: 'Ditto', player: 1, version: 0 };
    SessionService.getDraftEntity.mockReturnValue(entity);
    validate.mockReturnValue({ valid: true, errors: [] });
    const forbidden = new Error('Forbidden: cannot save a Pokémon that belongs to another user');
    forbidden.status = 403;
    TeamRepository.savePokemon.mockRejectedValue(forbidden);

    const req = makeReq();
    const res = mockRes();
    await saveDraft(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('returns 409 when TeamRepository.savePokemon reports a version conflict', async () => {
    const entity = { name: 'Ditto', player: 1, version: 0 };
    SessionService.getDraftEntity.mockReturnValue(entity);
    validate.mockReturnValue({ valid: true, errors: [] });
    const conflict = new Error('Conflict: Ditto was modified after this draft was opened');
    conflict.status = 409;
    TeamRepository.savePokemon.mockRejectedValue(conflict);

    const req = makeReq();
    const res = mockRes();
    await saveDraft(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});
