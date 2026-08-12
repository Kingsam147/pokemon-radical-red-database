jest.mock('../../../teams/TeamRepository');
jest.mock('../../../infrastructure/logger/logger', () => ({ info: jest.fn() }));

const TeamRepository = require('../../../teams/TeamRepository');
const TeamEntity = require('../../../teams/TeamEntity');
const { getTeam, addTeam, removeTeam, saveFullTeam } = require('../../../teams/teamControllers');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe('teamControllers.getTeam', () => {
  test('returns 400 for an invalid player', async () => {
    const res = mockRes();
    await getTeam({ userId: 'u1', params: { player: '9', teamName: 'Main' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns the team with trainerInfo separated out', async () => {
    const team = new TeamEntity([], { name: 'Blue' });
    TeamRepository.findTeam.mockResolvedValue(team);
    const res = mockRes();
    await getTeam({ userId: 'u1', params: { player: '1', teamName: 'Main' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('teamControllers.addTeam', () => {
  test('returns 400 when the team already exists', async () => {
    const error = new Error('Main already exists in my box');
    error.code = 'DUPLICATE_TEAM';
    TeamRepository.addTeam.mockRejectedValue(error);
    const res = mockRes();
    await addTeam({ userId: 'u1', params: { player: '1' }, body: { teamName: 'Main' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('teamControllers.saveFullTeam (raw bench array preserved)', () => {
  test('passes the bench array straight through to replaceTeamContents', async () => {
    TeamRepository.replaceTeamContents.mockResolvedValue(undefined);
    TeamRepository.loadAllTeams.mockResolvedValue({});
    const bench = [{ name: 'Ditto' }];
    const res = mockRes();
    await saveFullTeam(
      { userId: 'u1', params: { player: '1', teamName: 'Main' }, body: { bench } },
      res,
    );
    expect(TeamRepository.replaceTeamContents).toHaveBeenCalledWith(1, 'u1', 'Main', bench);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 400 when bench is not an array', async () => {
    const res = mockRes();
    await saveFullTeam(
      { userId: 'u1', params: { player: '1', teamName: 'Main' }, body: { bench: 'not-an-array' } },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
