const { v4: uuidv4 } = require('uuid');
const logger = require('../../infrastructure/logger/logger');
const { AUTH_EVENTS } = require('../../infrastructure/logger/events');

const COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

const initGuest = (req, res) => {
  const existingGuestId = req.signedCookies?.guest_id;
  if (existingGuestId) {
    logger.info(AUTH_EVENTS.GUEST_SESSION_RESUMED, { guestId: existingGuestId });
    return res.status(200).json({ guestId: existingGuestId });
  }

  const guestId = uuidv4();
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('guest_id', guestId, {
    httpOnly: true,
    signed: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    maxAge: COOKIE_MAX_AGE_MS,
  });

  logger.info(AUTH_EVENTS.GUEST_SESSION_CREATED, { guestId });
  return res.status(201).json({ guestId });
};

module.exports = { initGuest };
