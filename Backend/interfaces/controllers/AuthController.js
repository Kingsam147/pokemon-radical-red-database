const { db } = require('../../Config/mongodbOptions');
const logger = require('../../infrastructure/logger/logger');
const { AUTH_EVENTS } = require('../../infrastructure/logger/events');

const migrate = async (req, res) => {
  const authUserId = req.auth.payload.sub;
  const guestId = req.signedCookies?.guest_id;

  if (!guestId) {
    return res.status(200).json({ message: 'No guest session to migrate', migrated: 0 });
  }

  const [boxesResult, teamsResult] = await Promise.all([
    db.collection('myBoxes').updateMany({ userId: guestId }, { $set: { userId: authUserId } }),
    db.collection('myTeamSets').updateMany({ userId: guestId }, { $set: { userId: authUserId } }),
  ]);

  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('guest_id', {
    httpOnly: true,
    signed: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
  });

  const migrated = boxesResult.modifiedCount + teamsResult.modifiedCount;

  logger.info(AUTH_EVENTS.GUEST_MIGRATED, {
    authUserId,
    guestId,
    migratedBoxes: boxesResult.modifiedCount,
    migratedTeams: teamsResult.modifiedCount,
    totalMigrated: migrated,
  });

  return res.status(200).json({
    message: `Migrated ${migrated} document(s) to your account`,
    migrated,
  });
};

module.exports = { migrate };
