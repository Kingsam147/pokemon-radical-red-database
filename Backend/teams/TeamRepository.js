const { db } = require('../infrastructure/mongodbOptions');
const redis = require('../infrastructure/redis/redisClient');
const { getModels } = require('../game-data/loadModels');
const TeamEntity = require('./TeamEntity');

const P2_TEAMS_KEY = 'p2:teams';
const P2_TEAMS_TTL = 86400;

const collectionFor = (player) => (player === 1 ? 'myTeamSets' : 'enemyTeamSets');

const loadRawTeams = async (player, userId) => {
  if (player === 2) {
    const cached = await redis.get(P2_TEAMS_KEY);
    if (cached) return cached;
  }
  const query = player === 1 ? { userId } : {};
  const doc = await db.collection(collectionFor(player)).findOne(query);
  if (!doc) return {};
  const { _id, userId: _uid, ...teams } = doc;
  if (player === 2) await redis.set(P2_TEAMS_KEY, teams, P2_TEAMS_TTL);
  return teams;
};

const saveRawTeams = async (player, userId, rawTeams) => {
  if (player === 1) {
    await db
      .collection(collectionFor(player))
      .replaceOne({ userId }, { ...rawTeams, userId }, { upsert: true });
  } else {
    await db.collection(collectionFor(player)).replaceOne({}, rawTeams, { upsert: true });
    await redis.del(P2_TEAMS_KEY);
  }
};

const loadAllTeams = async (player, userId) => {
  const rawTeams = await loadRawTeams(player, userId);
  const models = getModels();
  const teams = {};
  for (const [teamName, rawTeam] of Object.entries(rawTeams)) {
    teams[teamName] = Array.isArray(rawTeam) ? rawTeam : TeamEntity.fromStoredDoc(rawTeam, models);
  }
  return teams;
};

const findTeam = async (player, teamName, userId) => {
  const teams = await loadAllTeams(player, userId);
  if (!(teamName in teams))
    throw new Error(
      `can't find ${teamName} ${player === 1 ? 'among my teams' : 'among the enemy teams'}`,
    );
  return teams[teamName];
};

const saveAllTeams = async (player, userId, teams) => {
  const rawTeams = {};
  for (const [teamName, team] of Object.entries(teams)) {
    rawTeams[teamName] = Array.isArray(team) ? team : team.toJSON();
  }
  await saveRawTeams(player, userId, rawTeams);
};

const addTeam = async (player, userId, teamName) => {
  const teams = await loadAllTeams(player, userId);
  if (teamName in teams) {
    const error = new Error(
      `${teamName} already exists ${player === 1 ? 'in my box' : ' among the enemy teams'}`,
    );
    error.code = 'DUPLICATE_TEAM';
    throw error;
  }
  teams[teamName] = new TeamEntity([]);
  await saveAllTeams(player, userId, teams);
  return teams;
};

const removeTeam = async (player, userId, teamName) => {
  const teams = await loadAllTeams(player, userId);
  if (!(teamName in teams)) {
    const error = new Error(
      `couldn't find ${teamName} ${player === 1 ? 'in my box' : ' among the enemy teams'}`,
    );
    error.code = 'NOT_FOUND';
    throw error;
  }
  delete teams[teamName];
  await saveAllTeams(player, userId, teams);
  return teams;
};

const removeAllTeams = async (player, userId) => {
  await saveRawTeams(player, userId, {});
};

const replaceTeamContents = async (player, userId, teamName, bench) => {
  const rawTeams = await loadRawTeams(player, userId);
  rawTeams[teamName] = bench;
  await saveRawTeams(player, userId, rawTeams);
};

const savePokemon = async (entity, teamName, pokemonName, userId) => {
  if (entity.userId !== undefined && entity.userId !== userId) {
    const forbidden = new Error(
      'Forbidden: cannot save a Pokémon that belongs to another user',
    );
    forbidden.status = 403;
    throw forbidden;
  }

  const teams = await loadAllTeams(entity.player, userId);
  const team = teams[teamName];
  if (!team || Array.isArray(team)) throw new Error(`Team "${teamName}" not found`);

  const stored = team.getPokemon(pokemonName);
  if (stored && stored.version !== entity.version) {
    const conflict = new Error(
      `Conflict: ${pokemonName} was modified after this draft was opened (expected v${entity.version}, found v${stored.version}). Re-activate to get the latest version.`,
    );
    conflict.status = 409;
    throw conflict;
  }

  const toSave = entity.prepareForSave();
  if (stored) team.updatePokemon(pokemonName, toSave);
  else team.addPokemon(toSave);

  await saveAllTeams(entity.player, userId, teams);
  return toSave;
};

const reassignOwner = async (oldUserId, newUserId) => {
  const result = await db
    .collection('myTeamSets')
    .updateMany({ userId: oldUserId }, { $set: { userId: newUserId } });
  return result.modifiedCount;
};

module.exports = {
  loadAllTeams,
  findTeam,
  saveAllTeams,
  addTeam,
  removeTeam,
  removeAllTeams,
  replaceTeamContents,
  savePokemon,
  reassignOwner,
};
