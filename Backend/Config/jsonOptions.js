const { db } = require('./mongodbOptions');
const redis = require('../infrastructure/redis/redisClient');

const P2_TEAMS_KEY = 'p2:teams';
const P2_TEAMS_TTL = 86400; // 24 hours

const loadTeams = async (player, userId) => {
    if (player === 2) {
        const cached = await redis.get(P2_TEAMS_KEY);
        if (cached) return cached;
    }

    const collectionName = player === 1 ? 'myTeamSets' : 'enemyTeamSets';
    const query = player === 1 ? { userId } : {};
    const doc = await db.collection(collectionName).findOne(query);
    if (!doc) return {};
    const { _id, userId: _uid, ...teams } = doc;

    if (player === 2) {
        await redis.set(P2_TEAMS_KEY, teams, P2_TEAMS_TTL);
    }

    return teams;
}

const saveTeams = async (player, userId, newTeams) => {
    const collectionName = player === 1 ? 'myTeamSets' : 'enemyTeamSets';
    if (player === 1) {
        await db.collection(collectionName).replaceOne({ userId }, { ...newTeams, userId }, { upsert: true });
    } else {
        await db.collection(collectionName).replaceOne({}, newTeams, { upsert: true });
        await redis.del(P2_TEAMS_KEY);
    }
}

const findTeam = async (player, teamName, userId) => {
    const allTeams = await loadTeams(player, userId);
    if (!(teamName in allTeams)) throw new Error(`can't find ${teamName} ${player === 1 ? "among my teams" : "among the enemy teams"}`);
    return allTeams[teamName];
}

module.exports = {
    loadTeams, saveTeams, findTeam
};