const fs = require('fs'); 
const { species2 } = require('./Config/jsonOptions'); 
const watchNames = ["ITEM_NONE", "DRAGONASCENT", "ITEM_ULTRANECROZIUM_Z"];
const megaStones = {};
for (const [pokemonName, pokemon] of Object.entries(species2)) {
    if (pokemon.evolution.length > 0 && pokemon.evolution[0][0] === "EVO_MEGA") {
        const megaStone = pokemon.evolution[0][1].replaceAll('ITEM_', '').replaceAll('_', ' ');
        megaStones[pokemonName] = megaStone[0] + megaStone.slice(1).toLowerCase();
    } 
   
    if ( !pokemon.evolution ) throw new Error (`${pokemonName} is not in my list of normalized pokemon`)
    // console.log(newPokemon)
}

fs.writeFileSync('./Models/megaStones.json/', JSON.stringify(megaStones, null, 2), 'utf8');