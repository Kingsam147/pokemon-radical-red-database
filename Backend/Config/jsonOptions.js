const fs = require("fs");
const path = require('path');
const { fetchModels, db } = require('./mongodbOptions');


// // the path to the folder with the JSON files
let models = {};
const loadModels = async () => {
    models = await fetchModels();
}

const getModels = () => models;

const avaliableTMS = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "Models", "avaliableTutors+TMS", "avaliableTMS.json"), 'utf8'));
const megaStones = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "Models", 'megaStones.json'), 'utf8'));


const loadMyBoxes = async (userId) => {
    const docs = await db.collection('myBoxes').find({ userId }).toArray();
    if (!docs.length) return [];
    return docs.map(({ _id, userId: _uid, ...box }) => box);
}

const saveMyBoxes = async (userId, newBoxes) => {
    await db.collection('myBoxes').deleteMany({ userId });
    if (newBoxes.length > 0) {
        await db.collection('myBoxes').insertMany(newBoxes.map(box => ({ ...box, userId })));
    }
}

const loadTeams = async (player, userId) => {
    const collectionName = player === 1 ? 'myTeamSets' : 'enemyTeamSets';
    const query = player === 1 ? { userId } : {};
    const doc = await db.collection(collectionName).findOne(query);
    if (!doc) return {};
    const { _id, userId: _uid, ...teams } = doc;
    return teams;
}

const saveTeams = async (player, userId, newTeams) => {
    const collectionName = player === 1 ? 'myTeamSets' : 'enemyTeamSets';
    if (player === 1) {
        await db.collection(collectionName).replaceOne({ userId }, { ...newTeams, userId }, { upsert: true });
    } else {
        await db.collection(collectionName).replaceOne({}, newTeams, { upsert: true });
    }
}

const findTeam = async (player, teamName, userId) => {
    const allTeams = await loadTeams(player, userId);
    if (!(teamName in allTeams)) throw new Error(`can't find ${teamName} ${player === 1 ? "among my teams" : "among the enemy teams"}`);
    return allTeams[teamName];
}

module.exports = {
    loadModels, getModels, avaliableTMS, megaStones,
    loadMyBoxes, saveMyBoxes, loadTeams, saveTeams, findTeam
};