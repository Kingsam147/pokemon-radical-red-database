const { getGuestStarterPikachu } = require('../../../guest-starter/publicControllers');
const { GUEST_STARTER_PIKACHU } = require('../../../guest-starter/guestStarterService');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

describe('getGuestStarterPikachu', () => {
  test('returns 200 with the starter Pikachu payload', async () => {
    const res = mockRes();

    await getGuestStarterPikachu({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ pokemon: GUEST_STARTER_PIKACHU });
  });

  test('sets edge-cacheable headers', async () => {
    const res = mockRes();

    await getGuestStarterPikachu({}, res);

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300, s-maxage=3600');
    expect(res.set).toHaveBeenCalledWith('CDN-Cache-Control', 'max-age=3600');
  });
});
