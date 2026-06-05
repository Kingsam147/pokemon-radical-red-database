jest.mock('../../Config/jsonOptions', () => ({
  loadTeams: jest.fn(),
  saveTeams: jest.fn(),
  findTeam: jest.fn(),
}));

jest.mock('../../infrastructure/logger/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
  security: jest.fn(), setUser: jest.fn(), clearUser: jest.fn(),
}));

const { loadTeams, saveTeams, findTeam } = require('../../Config/jsonOptions');
const { getTeam, getAllTeams, addTeam, removeTeam, removeAllTeams, saveFullTeam } = require('../../Controllers/teamControllers');

const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const userId = 'user-123';

describe('teamControllers', () => {
  let res;

  beforeEach(() => {
    res = buildRes();
    jest.clearAllMocks();
  });

  describe('getAllTeams', () => {
    test('returns 400 when player is not 1 or 2', async () => {
      const req = { userId, params: { player: '3' } };
      await getAllTeams(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns all teams for valid player', async () => {
      const teams = { TeamA: {}, TeamB: {} };
      loadTeams.mockResolvedValue(teams);
      const req = { userId, params: { player: '1' } };
      await getAllTeams(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ allTeams: teams });
    });
  });

  describe('addTeam', () => {
    test('returns 400 when player is invalid', async () => {
      const req = { userId, params: { player: '5' }, body: { teamName: 'Team1' } };
      await addTeam(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 400 when team name already exists', async () => {
      loadTeams.mockResolvedValue({ ExistingTeam: {} });
      const req = { userId, params: { player: '1' }, body: { teamName: 'ExistingTeam' } };
      await addTeam(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('creates new team and returns 200', async () => {
      loadTeams
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ NewTeam: {} });
      saveTeams.mockResolvedValue();
      const req = { userId, params: { player: '1' }, body: { teamName: 'NewTeam' } };
      await addTeam(req, res);
      expect(saveTeams).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ teamName: 'NewTeam' }));
    });
  });

  describe('removeTeam', () => {
    test('returns 404 when team does not exist', async () => {
      loadTeams.mockResolvedValue({});
      const req = { userId, params: { player: '1', teamName: 'Ghost' } };
      await removeTeam(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('deletes existing team and returns 200', async () => {
      loadTeams
        .mockResolvedValueOnce({ TargetTeam: {} })
        .mockResolvedValueOnce({});
      saveTeams.mockResolvedValue();
      const req = { userId, params: { player: '1', teamName: 'TargetTeam' } };
      await removeTeam(req, res);
      expect(saveTeams).toHaveBeenCalledWith(1, userId, {});
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('removeAllTeams', () => {
    test('clears all teams and returns 200', async () => {
      saveTeams.mockResolvedValue();
      loadTeams.mockResolvedValue({});
      const req = { userId, params: { player: '1' } };
      await removeAllTeams(req, res);
      expect(saveTeams).toHaveBeenCalledWith(1, userId, {});
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('saveFullTeam', () => {
    test('returns 400 when bench is not an array', async () => {
      const req = { userId, params: { player: '1', teamName: 'Team1' }, body: { bench: 'not-array' } };
      await saveFullTeam(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('saves team bench and returns 200', async () => {
      const bench = [{ name: 'Charizard' }, { name: 'Blastoise' }];
      loadTeams
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ Team1: bench });
      saveTeams.mockResolvedValue();
      const req = { userId, params: { player: '1', teamName: 'Team1' }, body: { bench } };
      await saveFullTeam(req, res);
      expect(saveTeams).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getTeam', () => {
    test('returns 404 when team not found', async () => {
      findTeam.mockRejectedValue(new Error("can't find TestTeam"));
      const req = { userId, params: { player: '1', teamName: 'TestTeam' } };
      await getTeam(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns team data for valid request', async () => {
      const trainer = { trainerInfo: 'info', pokemon1: { name: 'Pikachu' } };
      findTeam.mockResolvedValue(trainer);
      const req = { userId, params: { player: '1', teamName: 'TestTeam' } };
      await getTeam(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
