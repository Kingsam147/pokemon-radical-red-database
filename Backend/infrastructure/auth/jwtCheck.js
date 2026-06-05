const { auth } = require('express-oauth2-jwt-bearer');
const logger = require('../logger/logger');
const { AUTH_EVENTS } = require('../logger/events');

const rawJwtCheck = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  tokenSigningAlg: 'RS256',
});

const jwtCheck = (req, res, next) => {
  rawJwtCheck(req, res, (err) => {
    if (err) {
      const isExpired = err.code === 'invalid_token' && err.message?.includes('expired');
      logger.security(isExpired ? AUTH_EVENTS.JWT_EXPIRED : AUTH_EVENTS.JWT_INVALID, {
        error: err.message,
        code: err.code,
        path: req.path,
        method: req.method,
      });
      return next(err);
    }
    logger.info(AUTH_EVENTS.JWT_VALID, { userId: req.auth?.payload?.sub, path: req.path });
    next();
  });
};

module.exports = jwtCheck;
