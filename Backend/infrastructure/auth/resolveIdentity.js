const jwtCheck = require('./jwtCheck');
const logger = require('../logger/logger');
const { AUTH_EVENTS, SECURITY_EVENTS } = require('../logger/events');

const resolveIdentity = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return jwtCheck(req, res, (err) => {
      if (err) {
        logger.security(AUTH_EVENTS.JWT_INVALID, {
          error: err.message,
          code: err.code,
          path: req.path,
          method: req.method,
        });
        return next(err);
      }
      req.userId = req.auth.payload.sub;
      req.isGuest = false;
      logger.setUser(req.userId, false);
      logger.info(AUTH_EVENTS.IDENTITY_RESOLVED_AUTH, { userId: req.userId, path: req.path });
      next();
    });
  }

  const guestId = req.signedCookies?.guest_id;
  if (!guestId) {
    logger.security(SECURITY_EVENTS.UNAUTHORIZED_ACCESS, { path: req.path, method: req.method });
    return res.status(401).json({ message: 'Authentication required' });
  }

  req.userId = guestId;
  req.isGuest = true;
  logger.setUser(guestId, true);
  logger.info(AUTH_EVENTS.IDENTITY_RESOLVED_GUEST, { guestId, path: req.path });
  next();
};

module.exports = resolveIdentity;
