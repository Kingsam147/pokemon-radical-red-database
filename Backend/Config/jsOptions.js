const path = require("path"); 
const fs = require("fs"); 

const models = path.join(__dirname, "..", "Models"); 

const tutorEggMoveInfo = require(path.join(models, "avaliableTutors+TMS", "tutorEggMoveInfo.js")); 
const bannedMovesFile = require(path.join(models, "restrictedBannedStuff", "bannedMoves.js")); 
const restrictedAbilitiesFile = require(path.join(models, "restrictedBannedStuff", "restrictedAbilities.js")); 

const { isEggMoves, tutorLevel, tutorTable } = tutorEggMoveInfo; 
const { bannedMoves, leechSeedExceptions, toxicExceptions } = bannedMovesFile;
const { bannedAbilities, abilityExceptions } = restrictedAbilitiesFile;

module.exports = { 
    isEggMoves, tutorLevel, tutorTable, bannedMoves, leechSeedExceptions, toxicExceptions, bannedAbilities, abilityExceptions 
};