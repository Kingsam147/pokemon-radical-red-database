
const allAvaliableMoves = (pokemon, level, tutorTable, tutorLevel, avaliableTMS, isEggMoves) => {

    const learnMoves = pokemon.levelUpLearnsets
        .filter(move => level >= move[1])
        .map(move => move[0])

    const tutorMoves = pokemon.tutorLearnsets.filter(move =>tutorTable[tutorLevel].includes(move))


    // console.log("TMS"); 
    // console.log(avaliableTMS.sort())
    const tmsHMSMoves = pokemon.TMHMLearnsets.filter(move => avaliableTMS.includes(move))

    const eggMoves = isEggMoves ? pokemon.eggMovesLearnsets : [];

    return [... new Set([...learnMoves, ...tmsHMSMoves, ...eggMoves, ...tutorMoves])].sort(); 
} 

module.exports = allAvaliableMoves ; 

