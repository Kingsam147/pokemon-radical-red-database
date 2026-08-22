jest.mock('../../../teams/TeamRepository');
jest.mock('../../../pokemon/createFromImportText');
jest.mock('../../../forms/checkMega');

const TeamRepository = require('../../../teams/TeamRepository');
const TeamEntity = require('../../../teams/TeamEntity');
const createFromImportText = require('../../../pokemon/createFromImportText');
const { checkMega } = require('../../../forms/checkMega');
const { addPokemon, updatePokemon } = require('../../../teams/pokemonInTeamControllers');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe('pokemonInTeamControllers.addPokemon (now version-checked)', () => {
  test('routes each imported Pokemon through TeamRepository.savePokemon', async () => {
    checkMega.mockReturnValue(false);
    const entity = { name: 'Ditto', player: 1, version: 0 };
    createFromImportText.mockReturnValue(entity);
    TeamRepository.savePokemon.mockResolvedValue({ ...entity, version: 1 });
    TeamRepository.findTeam.mockResolvedValue(new TeamEntity([]));

    const req = {
      userId: 'u1',
      params: { player: '1', teamName: 'Main' },
      body: { pokemonData: 'Ditto\nLevel: 50' },
    };
    const res = mockRes();
    await addPokemon(req, res);

    expect(TeamRepository.savePokemon).toHaveBeenCalledWith(entity, 'Main', 'Ditto', 'u1');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('returns 409 when TeamRepository.savePokemon reports a version conflict', async () => {
    checkMega.mockReturnValue(false);
    createFromImportText.mockReturnValue({ name: 'Ditto', player: 1, version: 0 });
    TeamRepository.findTeam.mockResolvedValue(new TeamEntity([]));
    const conflict = new Error('Conflict: Ditto was modified after this draft was opened');
    conflict.status = 409;
    TeamRepository.savePokemon.mockRejectedValue(conflict);

    const req = {
      userId: 'u1',
      params: { player: '1', teamName: 'Main' },
      body: { pokemonData: 'Ditto\nLevel: 50' },
    };
    const res = mockRes();
    await addPokemon(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('pokemonInTeamControllers.addPokemon (same-batch duplicate guard)', () => {
  test('does not throw/500 when the same species is pasted twice in one batch, and reports the second as a duplicate', async () => {
    checkMega.mockReturnValue(false);
    createFromImportText.mockImplementation((pokemonText) => ({
      name: pokemonText.split('\n')[0].trim(),
      player: 1,
      version: 0,
    }));
    TeamRepository.findTeam.mockResolvedValue(new TeamEntity([]));
    TeamRepository.savePokemon.mockImplementation((entity) =>
      Promise.resolve({ ...entity, version: 1 }),
    );

    const req = {
      userId: 'u1',
      params: { player: '1', teamName: 'Main' },
      body: { pokemonData: 'Ditto\nLevel: 50\n\nDitto\nLevel: 50' },
    };
    const res = mockRes();
    await addPokemon(req, res);

    expect(TeamRepository.savePokemon).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(409);
    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.error).toContain('Ditto');
    expect(responseBody.partialSuccess).toContain('Ditto');
  });
});

describe('pokemonInTeamControllers.updatePokemon', () => {
  test('successfully updates a Pokemon that exists in the team, returns 200 with the updated Pokemon', async () => {
    const team = new TeamEntity([]);
    team.hasPokemon = jest.fn().mockReturnValue(true);
    TeamRepository.findTeam.mockResolvedValue(team);
    TeamRepository.loadAllTeams.mockResolvedValue({ Main: team });
    const updatedEntity = { name: 'Ditto', player: 1, version: 0 };
    createFromImportText.mockReturnValue(updatedEntity);
    TeamRepository.savePokemon.mockResolvedValue({ ...updatedEntity, version: 1 });

    const req = {
      userId: 'u1',
      params: { player: '1', teamName: 'Main', pokemonName: 'Ditto' },
      body: { pokemonData: 'Ditto\nLevel: 50' },
    };
    const res = mockRes();
    await updatePokemon(req, res);

    expect(TeamRepository.savePokemon).toHaveBeenCalledWith(
      updatedEntity,
      'Main',
      'Ditto',
      'u1',
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 404 when the team does not exist', async () => {
    const notFound = new Error("can't find Main among my teams");
    TeamRepository.findTeam.mockRejectedValue(notFound);

    const req = {
      userId: 'u1',
      params: { player: '1', teamName: 'Main', pokemonName: 'Ditto' },
      body: { pokemonData: 'Ditto\nLevel: 50' },
    };
    const res = mockRes();
    await updatePokemon(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(TeamRepository.savePokemon).not.toHaveBeenCalled();
  });

  test('returns 404 when the team exists but does not contain the target Pokemon', async () => {
    const team = new TeamEntity([]);
    team.hasPokemon = jest.fn().mockReturnValue(false);
    TeamRepository.findTeam.mockResolvedValue(team);

    const req = {
      userId: 'u1',
      params: { player: '1', teamName: 'Main', pokemonName: 'Ditto' },
      body: { pokemonData: 'Ditto\nLevel: 50' },
    };
    const res = mockRes();
    await updatePokemon(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(TeamRepository.savePokemon).not.toHaveBeenCalled();
  });

  test('returns 409 when TeamRepository.savePokemon reports a version conflict', async () => {
    const team = new TeamEntity([]);
    team.hasPokemon = jest.fn().mockReturnValue(true);
    TeamRepository.findTeam.mockResolvedValue(team);
    createFromImportText.mockReturnValue({ name: 'Ditto', player: 1, version: 0 });
    const conflict = new Error('Conflict: Ditto was modified after this draft was opened');
    conflict.status = 409;
    TeamRepository.savePokemon.mockRejectedValue(conflict);

    const req = {
      userId: 'u1',
      params: { player: '1', teamName: 'Main', pokemonName: 'Ditto' },
      body: { pokemonData: 'Ditto\nLevel: 50' },
    };
    const res = mockRes();
    await updatePokemon(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});
