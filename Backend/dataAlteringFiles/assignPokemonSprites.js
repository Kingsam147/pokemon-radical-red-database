const fs = require('fs'); 
const path = require('path'); 
const { species2 } = require('../Config/jsonOptions');
const { rename } = require('fs/promises');


const femaleSpriteNumbers = [
        3, 12, 19, 20, 25, 26, 41, 42, 44, 45, 64, 65, 84, 85, 97, 111,
        112, 118, 119, 123, 129, 130, 133, 154, 165, 166, 178, 185, 186, 190, 
        194, 195, 198, 202, 203, 207, 208, 212, 214, 215, 217, 221, 224, 229, 232, 
        255, 256, 257, 267, 269, 272, 274, 275, 307, 308, 315, 316, 317, 322, 323, 
        332, 350, 369, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 407, 415, 
        417, 418, 419, 424, 443, 444, 445, 449, 450, 453, 454, 456, 457, 459, 460, 
        461, 464, 465, 473, 521, 592, 593, 668, 678, 876, 916, 10033, 10235
    ];

const markedNumbers = [];

async function testRun() {
    const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=2000");
    const data = await response.json();

    const lookup = {};
    data.results.forEach(p => {
        const id = p.url.split('/').filter(Boolean).pop();
        lookup[p.name] = id;
    });

    const spriteFolder = fs.readdirSync('../../Frontend/public/sprites/pokemon');

    for (const [pokemonName, pokemon] of Object.entries(species2)) {
        if (pokemonName === "NONE" || pokemonName === "Egg") continue;
        
        const cleanName = pokemonName.toLowerCase()
                .replace(/[.']/g, '')     // Handles Mr. Mime -> mrmime or Farfetch'd -> farfetchd
                .replace(/[ _]/g, '-')
        
        if (lookup[cleanName]) {
            console.log(`${cleanName}: ${lookup[cleanName]}`);
        } else {
            console.warn(`Couldn't find ${cleanName} in the pre-fetched list`);
        }
    }

}

async function updateSpeciesFile() {
    try {
        // 1. Load your manual overrides
        const missingData = JSON.parse(fs.readFileSync('missing_pokemon.json', 'utf8'));

        // 2. Fetch master list from PokeAPI for everything else
        console.log("Fetching API master list...");
        const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=2000");
        const apiData = await response.json();
        
        // Create a quick lookup map from the API: { "pikachu": 25 }
        const apiLookup = {};
        apiData.results.forEach((p, index) => {
            // The ID is at the end of the URL: .../pokemon/25/
            const id = p.url.split('/').filter(Boolean).pop();
            apiLookup[p.name] = parseInt(id);
        });

        const updatedSpecies = {};

        console.log("Updating IDs...");
        for (const [dbKey, data] of Object.entries(species2)) {
            if (dbKey === "NONE" || dbKey === "Egg") {
                updatedSpecies[dbKey] = data;
                continue;
            }

            // Use your specific formatting logic
            const formattedName = dbKey.toLowerCase()
                .replace(/[.']/g, '')
                .replace(/[ _]/g, '-');

            let newId = data.id; // Keep old ID as fallback

            // Check manual overrides first, then PokeAPI lookup
            if (missingData[dbKey]) {
                newId = missingData[dbKey];
            } else if (apiLookup[formattedName]) {
                newId = apiLookup[formattedName];
            }

            // Create new object with all old data but the new ID
            updatedSpecies[dbKey] = {
                ...data,
                ID: newId
            };

            if (femaleSpriteNumbers.includes(updatedSpecies[dbKey].ID)) {
                updatedSpecies[dbKey].femaleSprite = true;
                markedNumbers.push(updatedSpecies[dbKey].name)
            } else {
                updatedSpecies[dbKey].femaleSprite = false;
            }

        }

        console.log(markedNumbers)
        fs.writeFileSync('species_updated.json', JSON.stringify(updatedSpecies, null, 4));
        console.log("Success! Created species_updated.json");

    } catch (error) {
        console.error("Error updating file:", error.message);
    }
}

updateSpeciesFile();