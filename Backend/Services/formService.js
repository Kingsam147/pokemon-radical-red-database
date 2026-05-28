const { getModels } = require('../Config/jsonOptions'); 
const { bannedAbilities, abilityExceptions } = require('../Config/jsOptions.js'); 
const { createPokemon } = require('./pokemonService.js'); 

// when adding a pokemon it checks to see if it's a mega
const checkMega = (importedPokemon) => {

    const { species2 } = getModels;
    const bannedForms = ['-Mega', "Greninja-Ash"];
    
    // if dealing with import Text
    if (typeof(importedPokemon) === 'string') {

        const firstLine = importedPokemon.split('\n')[0];
        const name =  firstLine.split('@')[0];
        return (bannedForms.some(bannedForm => name.includes(bannedForm)));


    // if dealing with pokemon object
    } else if (typeof(importedPokemon )=== 'object') {

        return bannedForms.some(bannedForm => pokemon.name.includes(bannedForm));

    }
    
}

// if it is then import it's normal form with the same everything but holding the mega item
const addMega = (importText, player) => {

    const firstLine = importText.split('\n')[0];
    const [megaName, originalItem] =  firstLine.split('@'); 
    const isAshGreninja = megaName === 'Greninja-Ash';
    
    const normalName = !isAshGreninja ?  megaName.split('-Mega')[0] : "Greninja";
    const isRayquaza = normalName === "Rayquaza";
    const originalAbility = importText.split('\n')
        .find(line => line.includes('Ability'))
        .split('Ability: ')[1]

    if (!species2[megaName]) throw new Error (`${megaName} isn't a pokemon in the database (addMega)`)
    const megaPokemon = species2[megaName];
    
    const abilitiesIndex = megaPokemon.abilities.includes(originalAbility) ? 
        megaPokemon.abilities.findIndex(ability => ability === originalAbility) : 0

    
    const normalPokemon = species[normalName];

    const newFirstLine = normalName + (!isRayquaza ? " @ Mega Stone" : (` @ ${originalItem}` || ""));

    const newImportText = [newFirstLine, ...importText.split('\n').slice(1)]
        .map(line => { 
            if (line.includes('Ability')) return'Ability: ' + normalPokemon.abilities[abilitiesIndex]
            return line
        }).join("\n"); 

    // console.log(newImportText)
    

    return createPokemon(newImportText, player);

}


// when changing the form of the pokemon, create a new pokemon based off the form name 
const changeActiveForm = (existingPokemon, newFormName) => {

    if (existingPokemon.form === "") throw new Error(`${existingPokemon.name} doesn't have any other forms`) 
    if (!existingPokemon.alternateForms[newFormName]) throw new Error (`${existingPokemon.form} doesn't have another form by the name of ${newFormName}`)

    const desiredForm = existingPokemon.alternateForms[newFormName];
    const oldForm = existingPokemon.form;

    // move the current form to the alternate forms 
    existingPokemon.alternateForms[existingPokemon.form] = {
        form: existingPokemon.form, 
        ID: existingPokemon.ID,
        sprite: existingPokemon.sprite,
        baseStats: existingPokemon.baseStats, 
        type1: existingPokemon.type1, 
        type2: existingPokemon.type2, 
        ability: existingPokemon.ability, 
        abilities: existingPokemon.abilities, 
        allMoves: existingPokemon.allMoves
    };

    
    // change the pokemon.form, ID, sprite, basestats, type1, type2, ability, and abilities to the new form
    existingPokemon.form = desiredForm.form;
    existingPokemon.ID = desiredForm.ID;
    existingPokemon.sprite = desiredForm.sprite;
    existingPokemon.baseStats = desiredForm.baseStats;
    existingPokemon.type1 = desiredForm.type1; 
    existingPokemon.type2 = desiredForm.type2;

    const abilityIndex = (existingPokemon.abilities.findIndex(ability => ability === existingPokemon.ability) || 0);
    if (abilityIndex < desiredForm.abilities.length) {
        existingPokemon.ability = desiredForm.abilities[abilityIndex];
    } else {
        existingPokemon.ability = desiredForm.abilities[0];
    }
    
    existingPokemon.abilities = desiredForm.abilities;
    
    return existingPokemon;
}

const practiceText = 
`Blaziken-Mega
Level: 47
Jolly Nature
Ability: Striker
EVs: 252 Atk / 252 Spe
IVs: 30 Atk / 30 SpD
- High Jump Kick
- Blaze Kick
- Brave Bird
- Detect`; 

const practiceText2 = "Blaziken-Mega\nLevel: 47\nJolly Nature\nAbility: Speed Boost\nEVs: 252 Atk / 252 Spe\nIVs: 30 Atk / 30 SpD\n- High Jump Kick\n- Blaze Kick\n- Brave Bird\n- Detect"

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

const dummyPokemon = {
    "name": "Blaziken",
    "form": "Blaziken",
    "ID": 282,
    "sprite": "https://raw.githubusercontent.com/funnotbun/funnotbun.github.io/main/data/species/frontspr/gFrontSprite282Blaziken.png",
    "forms": [
      "Blaziken",
      "Blaziken-Mega"
    ],
    "type1": "Fire",
    "type2": "Fighting",
    "gender": "",
    "level": 47,
    "nature": "Jolly",
    "item": "Mega Stone",
    "ability": "Striker",
    "abilities": [
      "Striker",
      "Infiltrator"
    ],
    "baseStats": {
      "HP": 80,
      "Atk": 120,
      "Def": 70,
      "SpA": 110,
      "SpD": 70,
      "Spe": 80
    },
    "EVs": {
      "HP": 0,
      "Atk": 252,
      "Def": 0,
      "SpA": 0,
      "SpD": 0,
      "Spe": 252
    },
    "IVs": {
      "HP": 31,
      "Atk": 30,
      "Def": 31,
      "SpA": 31,
      "SpD": 30,
      "Spe": 31
    },
    "moveset": [
      "High Jump Kick",
      "Blaze Kick",
      "Brave Bird",
      "Detect"
    ],
    "allMoves": [
      "Acrobatics",
      "Aerial Ace",
      "Blaze Kick",
      "Brave Bird",
      "Brick Break",
      "Bulldoze",
      "Cut",
      "Defog",
      "Detect",
      "Dig",
      "Double Kick",
      "Ember",
      "Facade",
      "Fire Punch",
      "Flamethrower",
      "Growl",
      "High Jump Kick",
      "Incinerate",
      "Low Kick",
      "Low Sweep",
      "Peck",
      "Poison Jab",
      "Quick Attack",
      "Rest",
      "Return",
      "Roar",
      "Rock Slide",
      "Rock Tomb",
      "Scorching Sands",
      "Scratch",
      "Shadow Claw",
      "Sky Uppercut",
      "Slash",
      "Sleep Talk",
      "Thunder Punch",
      "Triple Arrows",
      "U-turn"
    ],
    "alternateForms": {
      "Blaziken-Mega": {
        "form": "Blaziken-Mega",
        "ID": 891,
        "sprite": "https://raw.githubusercontent.com/funnotbun/funnotbun.github.io/main/data/species/frontspr/gFrontSprite891BlazikenMega.png",
        "type1": "Fire",
        "type2": "Fighting",
        "abilities": [
          "Striker"
        ],
        "baseStats": {
          "HP": 80,
          "Atk": 160,
          "Def": 80,
          "SpA": 130,
          "SpD": 80,
          "Spe": 100
        }
      }
    }
  }

const dummy2 = changeActiveForm(dummyPokemon, 'Blaziken-Mega');
// console.log(dummy2);

// console.log(checkMega(testDummy) ? addMega(testDummy) : createPokemon(testDummy))
// addMega(practiceText4)


module.exports = { checkMega, addMega, changeActiveForm }