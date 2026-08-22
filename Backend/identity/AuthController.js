const BoxRepository = require('../boxes/BoxRepository');
const TeamRepository = require('../teams/TeamRepository');
const logger = require('../infrastructure/logger/logger');
const { AUTH_EVENTS } = require('../infrastructure/logger/events');

const migrate = async (req, res) => {
  const authUserId = req.auth.payload.sub;
  const guestId = req.signedCookies?.guest_id;

  if (!guestId) {
    return res.status(200).json({ message: 'No guest session to migrate', migrated: 0 });
  }

  const [migratedBoxes, migratedTeams] = await Promise.all([
    BoxRepository.reassignOwner(guestId, authUserId),
    TeamRepository.reassignOwner(guestId, authUserId),
  ]);

  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('guest_id', {
    httpOnly: true,
    signed: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
  });

  const migrated = migratedBoxes + migratedTeams;

  logger.info(AUTH_EVENTS.GUEST_MIGRATED, {
    authUserId,
    guestId,
    migratedBoxes,
    migratedTeams,
    totalMigrated: migrated,
  });

  return res.status(200).json({ message: `Migrated ${migrated} document(s) to your account`, migrated });
};

module.exports = { migrate };
