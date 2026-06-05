jest.mock('express-oauth2-jwt-bearer', () => ({ auth: jest.fn(() => jest.fn()) }));
jest.mock('../../infrastructure/auth/jwtCheck');
jest.mock('../../infrastructure/logger/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
  security: jest.fn(), setUser: jest.fn(), clearUser: jest.fn(),
}));

const jwtCheck = require('../../infrastructure/auth/jwtCheck');
const resolveIdentity = require('../../infrastructure/auth/resolveIdentity');

const buildReq = (overrides = {}) => ({
  headers: {},
  signedCookies: {},
  path: '/test',
  method: 'GET',
  ...overrides,
});

const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('resolveIdentity middleware', () => {
  let res, next;

  beforeEach(() => {
    res = buildRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('resolves authenticated user from valid Bearer token', done => {
    jwtCheck.mockImplementation((req, _res, cb) => {
      req.auth = { payload: { sub: 'auth0|user999' } };
      cb();
    });
    const req = buildReq({ headers: { authorization: 'Bearer validtoken' } });

    resolveIdentity(req, res, () => {
      expect(req.userId).toBe('auth0|user999');
      expect(req.isGuest).toBe(false);
      done();
    });
  });

  test('calls next with error when JWT validation fails', done => {
    const jwtError = new Error('invalid_token');
    jwtError.code = 'invalid_token';
    jwtCheck.mockImplementation((_req, _res, cb) => cb(jwtError));

    const req = buildReq({ headers: { authorization: 'Bearer badtoken' } });

    resolveIdentity(req, res, (err) => {
      expect(err).toBe(jwtError);
      done();
    });
  });

  test('resolves guest user from signed cookie', done => {
    const req = buildReq({ signedCookies: { guest_id: 'guest-uuid-abc' } });

    resolveIdentity(req, res, () => {
      expect(req.userId).toBe('guest-uuid-abc');
      expect(req.isGuest).toBe(true);
      done();
    });
  });

  test('returns 401 when no Bearer token and no guest cookie', () => {
    const req = buildReq();
    resolveIdentity(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  test('does not treat non-Bearer Authorization header as JWT', done => {
    const req = buildReq({
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
      signedCookies: { guest_id: 'guest-fallback' },
    });

    resolveIdentity(req, res, () => {
      expect(req.userId).toBe('guest-fallback');
      expect(req.isGuest).toBe(true);
      done();
    });
  });
});
