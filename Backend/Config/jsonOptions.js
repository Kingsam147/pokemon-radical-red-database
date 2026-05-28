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


const loadMyBoxes = async () => {
    const docs = await db.collection('myBoxes').find({}).toArray(); 
    if (!docs.length) return []; 
    
    return docs.map(({ _id, ...box }) => box);
}

const saveMyBoxes = async (newBoxes) => {
    await db.collection('myBoxes').deleteMany({});
    if (newBoxes.length > 0) await db.collection('myBoxes').insertMany(newBoxes); 
}

const loadTeams = async (player) => {
    const collectionName = player === 1 ? 'myTeamSets' : 'enemyTeamSets'; 
    const doc = await db.collection(collectionName).findOne({});
    if (!doc) return {}; 
    const {_id, ...teams } = doc; 
    return teams;
}

const saveTeams = async (player, newTeams) => {
    const collectionName = player === 1 ? 'myTeamSets' : 'enemyTeamSets'; 
    await db.collection(collectionName).replaceOne({}, newTeams, {upsert: true });
}


const findTeam = async (player, teamName) => {
    const allTeams = await loadTeams(player); 
    if ( !(teamName in allTeams) ) throw new Error(`can't find ${teamName} ${player === 1 ? "among my teams" : "among the enemy teams"}`); 
    return allTeams[teamName];
}

module.exports = {
    loadModels, getModels, avaliableTMS, megaStones,
    loadMyBoxes, saveMyBoxes, loadTeams, saveTeams, findTeam
};