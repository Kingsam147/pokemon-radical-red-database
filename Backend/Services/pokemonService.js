const { getModels, avaliableTMS, megaStones } = require('../Config/jsonOptions.js');

const { isEggMoves, tutorLevel, tutorTable, bannedMoves, leechSeedExceptions, toxicExceptions, bannedAbilities, abilityExceptions } = require('../Config/jsOptions.js');
const parsePokemonText = require('../Domain/parsePokemonText');
const allAvaliableMoves = require('../Domain/pokemonMovesets'); 
const legalMoves = require('../Domain/legalMoves'); 
const legalAbility = require('../Domain/legalAbilites'); 
const stats = require('../Domain/statCalculator');

// given an imported Pokemon text from the damage calculator, 


// create a Pokemon object using the imported text and the pokemon data from the API 
// and add it to the Pokemon model

const practiceText1 = 
`Blaziken-Mega
Level: 47
Jolly Nature
Ability: Speed Boost
EVs: 252 Atk / 252 Spe
IVs: 30 Atk / 30 SpD
- High Jump Kick
- Blaze Kick
- Brave Bird
- Detect`; 

const practiceText2 = 
`Cinderace @ Wide Lens
Level: 47
Jolly Nature
Ability: Libero
EVs: 252 Atk / 252 Spe
IVs: 30 Def / 30 SpA
- Pyro Ball
- Sucker Punch
- Acrobatics
- Mud Shot`;

const practiceText3 = 
`Blaziken @ Blazikenite
Level: 47
Jolly Nature
Ability: Speed Boost
EVs: 252 Atk / 252 Spe
IVs: 30 Atk / 30 SpD
- High Jump Kick
- Blaze Kick
- Brave Bird
- Detect`;

const practiceText4 = 
`Rayquaza-Mega @ Sharp Beak
Level: 85
Naive Nature
Ability: Delta Stream
- Earthquake
- Dragon Ascent
- Extreme Speed
- Flamethrower
`;

const practiceText5 = 
`Rotom-Fan
Level: 100
Hardy Nature
Ability: Motor Drive
`;

const practiceText6 = 
`Rayquaza-Meg @ Sharp Beak
Level: 85
Naive Nature
Ability: Delta Stream
- Earthquake
- Dragon Ascent
- Extreme Speed
- Flamethrower
`;

const practiceText7 = 
`Rayquaza @ Sharp Bek
Level: skibidi
Naiv Nature
Ability: Delta Stream
- Earthqua
- Dragon Ascent
- Extreme Speed
- Flamethrower
`;

const practiceText8 = 
`Gyarados @ Sitrus Berry
Level: 56
Jolly Nature
Ability: Intimidate
- Aqua Tail
- Ice Fang
- Crunch
- Thrash`

const practiceText9 = 
`Furret @ Normal Gem
Level: 56
Adamant Nature
Ability: Adaptability
- Extreme Speed
- Facade
- Follow Me
- Me First
`
const practiceText10 = 
`Kingler @ Wide Lens
Level: 56
Adamant Nature
Ability: Sheer Force
- Flip Turn
- Crabhammer
- Ice Punch
- Aqua Jet`

const practiceText11 = 
`Serperior  
Ability: Overgrow  
Tera Type: Grass  
IVs: 0 Atk  
- Defog  
- Toxic  
- Leech Seed`

const createPokemon = (pokemonText, player) => 
{

    // console.log(pokemonText)
    const { species2, items, natures, movesList } = getModels();
    
    if (!pokemonText) throw new Error ("Pokemon text can't be found");  
    if (typeof pokemonText !== 'string') throw new Error ("Pokemon data isn't a string"); 

    let { name, gender, item, level, nature, ability, moves, EVs, IVs } = parsePokemonText(pokemonText, items, megaStones, natures, species2, movesList);
    
    // check that all the info is valid 
    if (!species2[name]) throw new Error (`${name} isn't a valid Pokemon`); 
    const pokemon = species2[name]; 

    const femalePokemon = ["Alcremie", "Blissey", "Bounsweet", "Chansey", "Cresselia", "Enamorus", 
    "Flabébé", "Floette", "Florges", "Froslass", "Happiny", "Hatenna", 
    "Hatterene", "Hattrem", "Illumise", "Jynx", "Kangaskhan", "Latias", 
    "Lilligant", "Mandibuzz", "Milcery", "Miltank", "Nidoqueen", "Nidoran♀", 
    "Nidorina", "Ogerpon", "Petilil", "Salazzle", "Smoochum", "Steenee", 
    "Tinkatink", "Tinkaton", "Tinkatuff", "Tsareena", "Vespiquen", "Vullaby", 
    "Wormadam"
    ]

    const malePokemon = ["Braviary", "Fezandipiti", "Gallade", "Grimmsnarl", "Hitmonchan", 
    "Hitmonlee", "Hitmontop", "Impidimp", "Landorus", "Latios", 
    "Morgrem", "Mothim", "Munkidori", "Nidoking", "Nidoran♂", 
    "Nidorino", "Okidogi", "Rufflet", "Sawk", "Tauros", 
    "Throh", "Thundurus", "Tornadus", "Tyrogue", "Volbeat"]; 

    const genderlessNames = [
    "Magnemite", "Magneton", "Voltorb", "Electrode", "Staryu", "Starmie", "Ditto", "Porygon", 
    "Articuno", "Zapdos", "Moltres", "Mewtwo", "Mew", "Unown", "Porygon2", "Raikou", "Entei", 
    "Suicune", "Lugia", "Ho-Oh", "Celebi", "Shedinja", "Lunatone", "Solrock", "Baltoy", 
    "Claydol", "Beldum", "Metang", "Metagross", "Regirock", "Regice", "Registeel", "Kyogre", 
    "Groudon", "Rayquaza", "Jirachi", "Deoxys", "Bronzor", "Bronzong", "Magnezone", "Porygon-Z", 
    "Rotom", "Uxie", "Mesprit", "Azelf", "Dialga", "Palkia", "Regigigas", "Giratina", "Phione", 
    "Manaphy", "Darkrai", "Shaymin", "Arceus", "Victini", "Klink", "Klang", "Klinklang", 
    "Cryogonal", "Golett", "Golurk", "Cobalion", "Terrakion", "Virizion", "Reshiram", "Zekrom", 
    "Kyurem", "Keldeo", "Meloetta", "Genesect", "Carbink", "Xerneas", "Yveltal", "Zygarde", 
    "Diancie", "Hoopa", "Volcanion", "Type: Null", "Silvally", "Minior", "Dhelmise", 
    "Tapu Koko", "Tapu Lele", "Tapu Bulu", "Tapu Fini", "Cosmog", "Cosmoem", "Solgaleo", 
    "Lunala", "Nihilego", "Buzzwole", "Pheromosa", "Xurkitree", "Celesteela", "Kartana", 
    "Guzzlord", "Necrozma", "Magearna", "Marshadow", "Poipole", "Naganadel", "Stakataka", 
    "Blacephalon", "Zeraora", "Meltan", "Melmetal", "Sinistea", "Polteageist", "Falinks", 
    "Dracozolt", "Arctozolt", "Dracovish", "Arctovish", "Zacian", "Zamazenta", "Eternatus", 
    "Zarude", "Regieleki", "Regidrago", "Glastrier", "Spectrier", "Calyrex", "Tandemaus", 
    "Maushold", "Great Tusk", "Scream Tail", "Brute Bonnet", "Flutter Mane", "Slither Wing", 
    "Sandy Shocks", "Iron Treads", "Iron Bundle", "Iron Hands", "Iron Jugulis", "Iron Moth", 
    "Iron Thorns", "Gimmighoul", "Gholdengo", "Wo-Chien", "Chien-Pao", "Ting-Lu", "Chi-Yu", 
    "Roaring Moon", "Iron Valiant", "Koraidon", "Miraidon", "Walking Wake", "Iron Leaves", 
    "Poltchageist", "Sinistcha", "Gouging Fire", "Raging Bolt", "Iron Boulder", "Iron Crown", 
    "Pecharunt"]

    if (femalePokemon.includes(name)) gender = "F"; 
    else if (malePokemon.includes(name)) gender = "M"; 
    else if (genderlessNames.includes(name)) gender = "N";

    const abilityCases = [...Object.values(bannedAbilities), ...Object.values(abilityExceptions).map(exceptionAbility => exceptionAbility[1])]
    if (!pokemon.abilities.includes(ability) && !abilityCases.includes(ability)) ability = pokemon.abilities[0];
    const abilityIndex = pokemon.abilities.findIndex(possibleAbility => {
        return ability === possibleAbility
});


    const allMoves = allAvaliableMoves(pokemon, level, tutorTable, tutorLevel, avaliableTMS, isEggMoves);
    // console.log(allMoves);

    const filteredMoves = legalMoves(pokemon.name, allMoves, bannedMoves, leechSeedExceptions, toxicExceptions); 
    // console.log(filteredMoves);

    const filteredAbility = legalAbility(pokemon.name, ability, bannedAbilities, abilityExceptions); 

    // console.log(pokemon.abilities);
    const filteredAbilities = pokemon.abilities.map(ability => legalAbility(pokemon.name, ability, bannedAbilities, abilityExceptions)); 
        
    const baseStats = {
        HP: pokemon.baseHP, 
        Atk: pokemon.baseAttack, 
        Def: pokemon.baseDefense, 
        SpA: pokemon.baseSpAttack, 
        SpD: pokemon.baseSpDefense, 
        Spe: pokemon.baseSpeed
    }

    const finalHp = stats.finalHP(baseStats.HP, EVs.HP, IVs.HP, level);
    const finalStats = {
        HP: finalHp, 
        ...stats.finalStats(baseStats, EVs, IVs, nature, level)
    };

    const newPokemon = {
        'name': name, 
        'form': pokemon.name, 
        'ID': pokemon.ID,
        'sprite': pokemon.sprite, 
        'femaleSprite': pokemon.femaleSprite,
        'type1': pokemon.type1, 
        'type2': pokemon.type1 === pokemon.type2 ? "None" : pokemon.type2, 
        'gender': gender, 
        'level': level, 
        'nature': nature, 
        'item': item,
        'ability': player === 1 ? filteredAbility : ability,
        'abilities': [... new Set (player === 1 ? filteredAbilities : pokemon.abilities)], 
        'baseStats': baseStats,
        'EVs': EVs, 
        'IVs': IVs, 
        'finalStats': finalStats,
        'moveset': moves.map(move => moves.includes(move) ? move : ''), 
        'allMoves': player === 1 ? filteredMoves : allMoves,
        'forms': {},

    }; 
    // loop through forms and create another pokemon and store it in alternate forms 
    [pokemon.name, ...pokemon.forms].forEach(form => {
            const pokemonForm = species2[form];
            
            const alternateFilteredAbilities = pokemonForm.abilities.map(ability => 
                legalAbility(
                    pokemonForm.name, 
                    ability, 
                    bannedAbilities, 
                    abilityExceptions
                ));

            const alternateMoves = allAvaliableMoves(pokemonForm, level, tutorTable, tutorLevel, avaliableTMS, isEggMoves);
    

            const alternateFilteredMoves = legalMoves(
                pokemonForm.name.replace('_MEGA', ''), 
                alternateMoves, 
                bannedMoves, 
                leechSeedExceptions, 
                toxicExceptions
            ); 
       
            const baseStats = {
                HP: pokemon.baseHP, 
                Atk: pokemon.baseAttack, 
                Def: pokemon.baseDefense, 
                SpA: pokemon.baseSpAttack, 
                SpD: pokemon.baseSpDefense, 
                Spe: pokemon.baseSpeed
            }

            const finalHp = stats.finalHP(baseStats.HP, EVs.HP, IVs.HP, level);
            const finalStats = {
                HP: finalHp, 
                ...stats.finalStats(baseStats, EVs, IVs, nature, level)
            };

            newPokemon.forms[form] = {
                formName: form, 
                ID: pokemonForm.ID,
                sprite: pokemonForm.sprite, 
                type1: pokemonForm.type1, 
                type2: pokemonForm.type1 === pokemonForm.type2 ? "None" : pokemonForm.type2,  
                abilities: player === 1 ? alternateFilteredAbilities : pokemonForm.abilities, 
                baseStats: {
                    HP: pokemonForm.baseHP, 
                    Atk: pokemonForm.baseAttack, 
                    Def: pokemonForm.baseDefense, 
                    SpA: pokemonForm.baseSpAttack, 
                    SpD: pokemonForm.baseSpDefense, 
                    Spe: pokemonForm.baseSpeed
                }, 
                'finalStats': finalStats,
                allMoves: player === 1 ? alternateFilteredMoves : alternateMoves
            }

            const newForm = newPokemon.forms[form]
            newPokemon.forms[form].ability = newForm.abilities[abilityIndex]  ? newForm.abilities[abilityIndex] : (newForm.abilities[abilityIndex - 1] ? newForm.abilities[abilityIndex - 1] : newForm.abilities[0]);

            // if form has hidden ability and main form doesn't, then something went wrong
            const hasHiddenAbility = abilityIndex === newPokemon.forms[form].abilities.length - 1;
            if (hasHiddenAbility && abilityIndex !== pokemon.abilities.length - 1) {
                newPokemon.forms[form].ability = newPokemon.forms[form].abilities[0];
            }
           
        })
    
    
    return newPokemon;  
} 


const testPokemon = createPokemon(practiceText3, 1); 
// console.log(testPokemon);

const hasDuplicate = (pokemonName, listOfPokemon) => {
    return pokemonName in listOfPokemon
}
module.exports = { createPokemon, hasDuplicate };