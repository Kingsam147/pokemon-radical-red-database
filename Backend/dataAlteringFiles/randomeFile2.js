const fs = require('fs');
const { species, normalizedAbilities, normalizedMoves, normalizedSpecies, normalizedTypes } = require('./Config/jsonOptions')
const { nameFromFormat, moveFromFormat, abilityFromFormat, typeFromFormat } = require('./Domain/textConversion'); 

// console.log(normalizedSpecies)

const newSpecies = {};
for (const [pokemonName, pokemon] of Object.entries(species)) {
    const newPokemon = {};
    for (const [key, value] of Object.entries(pokemon)) {
        switch (key) {
            case "name": 
                // console.log(nameFromFormat(value, normalizedSpecies))
                newPokemon[key] = nameFromFormat(value, normalizedSpecies);
                break;
               case "ID": 
                newPokemon[key] = value;
                break;
            case "baseHP":
                newPokemon[key] = value;
                break;
            case "baseAttack":
                newPokemon[key] = value;
                break;
            case "baseDefense":
                newPokemon[key] = value;
                break;
            case "baseSpAttack":
                newPokemon[key] = value;
                break;
            case "baseSpDefense":
                newPokemon[key] = value;
                break;
            case "baseSpeed":
                newPokemon[key] = value;
                break;
            case "BST":
                newPokemon[key] = value;
                break;
            case "abilities":
                newPokemon[key] = value.map(ability => abilityFromFormat(ability, normalizedAbilities));
                break;
            case "type1":
                newPokemon[key] = typeFromFormat(value, normalizedTypes);
                break;
            case "type2":
                newPokemon[key] = typeFromFormat(value, normalizedTypes);
                break;
            case "item1":
                newPokemon[key] = value;
                break;
            case "item2":
                newPokemon[key] = value;
                break;
            case "eggGroup1":
                newPokemon[key] = value;
                break;
            case "eggGroup2":
                newPokemon[key] = value;
                break;
            case "changes":
                newPokemon[key] = value;
                break;
            case "levelUpLearnsets":
                newPokemon[key] = value.map(move => [moveFromFormat(move[0], normalizedMoves), move[1]]);
                break;
            case "TMHMLearnsets":
                newPokemon[key] = value.map(move => moveFromFormat(move, normalizedMoves));
                break;
            case "eggMovesLearnsets":
                newPokemon[key] = value.map(move => moveFromFormat(move, normalizedMoves));
                break;
            case "tutorLearnsets":
                newPokemon[key] = value.map(move => moveFromFormat(move, normalizedMoves));
                break;
            case "evolution":
                newPokemon[key] = value.map(evolution => {
                    if (evolution[1] in normalizedSpecies) evolution[1] = nameFromFormat(evolution[1], normalizedSpecies);
                    if ( !(evolution[2] in normalizedSpecies) ) throw new Error (`missing ${evolution[2]} from normalized species`)
                    evolution[2] = nameFromFormat(evolution[2], normalizedSpecies);
                    return evolution;
                });
                break;

            case "evolutionLine":
                newPokemon[key] = value.map(speciesName => nameFromFormat(speciesName, normalizedSpecies));
                break;

            case "forms":
                newPokemon[key] = value.map(form => nameFromFormat(form, normalizedSpecies));
                break;

            case "sprite":
                newPokemon[key] = value;
                break;            

            default: 
                throw new Error (`${key} entry not found in pokemon`)
        }
    }
    if ( !(pokemonName in normalizedSpecies) ) throw new Error (`${pokemonName} is not in my list of normalized pokemon`)
    // console.log(newPokemon)
    newSpecies[nameFromFormat(pokemonName, normalizedSpecies)] = newPokemon;
}

// console.log(newSpecies)

// write to file 
fs.writeFileSync('./Models/species2.json/', JSON.stringify(newSpecies, null, 2), 'utf8');