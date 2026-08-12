jest.mock('../../../boxes/BoxRepository');
jest.mock('../../../teams/TeamRepository');
jest.mock('../../../infrastructure/logger/logger', () => ({ info: jest.fn() }));

const BoxRepository = require('../../../boxes/BoxRepository');
const TeamRepository = require('../../../teams/TeamRepository');
const { migrate } = require('../../../identity/AuthController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn();
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe('AuthController.migrate', () => {
  test('returns early with migrated: 0 when there is no guest cookie', async () => {
    const req = { auth: { payload: { sub: 'auth-user-1' } }, signedCookies: {} };
    const res = mockRes();
    await migrate(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ migrated: 0 }));
    expect(BoxRepository.reassignOwner).not.toHaveBeenCalled();
  });

  test('reassigns ownership via both repositories, never touches the DB directly', async () => {
    BoxRepository.reassignOwner.mockResolvedValue(2);
    TeamRepository.reassignOwner.mockResolvedValue(1);

    const req = {
      auth: { payload: { sub: 'auth-user-1' } },
      signedCookies: { guest_id: 'guest-1' },
    };
    const res = mockRes();
    await migrate(req, res);

    expect(BoxRepository.reassignOwner).toHaveBeenCalledWith('guest-1', 'auth-user-1');
    expect(TeamRepository.reassignOwner).toHaveBeenCalledWith('guest-1', 'auth-user-1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ migrated: 3 }));
    expect(res.clearCookie).toHaveBeenCalledWith('guest_id', expect.any(Object));
  });
});
