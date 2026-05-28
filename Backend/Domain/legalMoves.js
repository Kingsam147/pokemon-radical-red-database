// given a list of all moves a pokemon can learn, return the legal ones

const legalMoves = (pokemonName, allMoves, bannedMoves, leechSeedExceptions, toxicExceptions) => {
    
    // console.log(pokemonName);
    // console.log(allMoves);
    // console.log(bannedMoves);
    // console.log(leechSeedExceptions);
    // console.log(toxicExceptions);

    const isLeechSeed = pokemonName in leechSeedExceptions; 
    const isToxic = pokemonName in toxicExceptions; 

    // console.log(isLeechSeed); 
    // console.log(isToxic); 

    return allMoves.filter(move => {

        if (move === "Leech Seed") return isLeechSeed
        
        if (move === "Toxic") return isToxic

        // 99% of moves being looked at
        return !(move in bannedMoves);
    })
} 

module.exports = legalMoves;

