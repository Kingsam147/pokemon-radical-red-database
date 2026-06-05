jest.mock('express-oauth2-jwt-bearer', () => {
  const mockMiddleware = jest.fn();
  global._testRawJwtMiddleware = mockMiddleware;
  return { auth: jest.fn(() => mockMiddleware) };
});

jest.mock('../../infrastructure/logger/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
  security: jest.fn(), setUser: jest.fn(), clearUser: jest.fn(),
}));

const logger = require('../../infrastructure/logger/logger');
const jwtCheck = require('../../infrastructure/auth/jwtCheck');

const buildReq = () => ({ headers: {}, path: '/teams/1', method: 'GET' });
const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('jwtCheck middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = buildReq();
    res = buildRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('calls next and logs JWT_VALID on successful validation', done => {
    global._testRawJwtMiddleware.mockImplementation((req, _res, cb) => {
      req.auth = { payload: { sub: 'auth0|valid' } };
      cb();
    });

    jwtCheck(req, res, () => {
      expect(logger.info).toHaveBeenCalledWith('auth.jwt.valid', expect.objectContaining({ userId: 'auth0|valid' }));
      done();
    });
  });

  test('calls next with error and logs JWT_INVALID on invalid token', done => {
    const error = Object.assign(new Error('invalid signature'), { code: 'invalid_token' });
    global._testRawJwtMiddleware.mockImplementation((_req, _res, cb) => cb(error));

    jwtCheck(req, res, (err) => {
      expect(err).toBe(error);
      expect(logger.security).toHaveBeenCalledWith('auth.jwt.invalid', expect.any(Object));
      done();
    });
  });

  test('logs JWT_EXPIRED (not JWT_INVALID) when token is expired', done => {
    const error = Object.assign(new Error('jwt expired'), { code: 'invalid_token' });
    global._testRawJwtMiddleware.mockImplementation((_req, _res, cb) => cb(error));

    jwtCheck(req, res, (err) => {
      expect(err).toBe(error);
      expect(logger.security).toHaveBeenCalledWith('auth.jwt.expired', expect.any(Object));
      expect(logger.security).not.toHaveBeenCalledWith('auth.jwt.invalid', expect.any(Object));
      done();
    });
  });

  test('distinguishes expired from invalid by message content', done => {
    const invalidError = Object.assign(new Error('invalid signature'), { code: 'invalid_token' });
    global._testRawJwtMiddleware.mockImplementation((_req, _res, cb) => cb(invalidError));

    jwtCheck(req, res, () => {
      expect(logger.security).toHaveBeenCalledWith('auth.jwt.invalid', expect.any(Object));
      done();
    });
  });
});
