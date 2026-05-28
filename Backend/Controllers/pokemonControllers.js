const { createPokemon, hasDuplicate } = require('../Services/pokemonService');
const { checkMega, addMega } = require('../Services/formService');
const { loadTeams, saveTeams, findTeam } = require("../Config/jsonOptions");


const addPokemon = async (req, res) => {
    try {
        // needs pokemon import text
        const player = Number(req.params.player);
        if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})

        const teamName = req.params.teamName;
        const { pokemonData } = req.body; 
        const currentBox = await loadTeams(player)
        const currentTeam = await findTeam(player, teamName);

        const newPokemons = pokemonData
            .trim()
            .split(/\n\s*\n/)
            .map(pokemonText => {
                // for each individual imported pokemon text 
                return checkMega(pokemonText) ? addMega(pokemonText, player) : createPokemon(pokemonText, player);

            }); 

        // checks for duplicates 
        // console.log(newPokemons);
        const duplicates = newPokemons.filter(pokemon => hasDuplicate(pokemon.name, currentTeam));
        const validPokemon = player === 1 ? newPokemons.filter(pokemon => !hasDuplicate(pokemon.name, currentBox)): newPokemons;

        // this is each individual pokemon being added
        validPokemon.forEach(pokemon => {
            currentTeam[pokemon.name] = pokemon; 
        }); 

        // update the team we added to in the box file
        currentBox[teamName] = currentTeam;
        await saveTeams(player, currentBox); 

        // if any duplicates sends an erorr message
        if (player === 1 && duplicates.length > 0) {
            return res.status(409).json({
                partialSuccess: `still added ${validPokemon.map(p => p.name).join(', ')} to ${player === 1 ? `${teamName} in my box` : `${teamName} in enemy box`}`,
                error: `${duplicates.map(pokemon => pokemon.name).join(', ')} already exists in ${teamName}`, 
                updatedTeam: await loadTeams(player)[teamName]
            })
        }

        // assuming that there were no duplicates then it returns a complete success message
        return res.status(201).json({
            message: `Successfully added ${newPokemons.map(p => p.name)} to ${player === 1 ? `${teamName} my box` : `${teamName} enemy box`}`, 
            addedPokemon: validPokemon,
            updatedTeam: await loadTeams(player)[teamName]
        }); 

    } catch (err) {
        return res.status(err.statusCode || 500).json({message: err.message || "Failed to add pokemon, double check the imported text"})
    }

} 

const findPokemon = async (req, res) => {
    // needs a pokemon name
    const player = Number(req.params.player)
    if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})

    const teamName = req.params.teamName;
    const pokemonName =  req.params.pokemonName
    const currentTeam = await findTeam(player, teamName); 

    const pokemon = currentTeam[pokemonName];

    if (!pokemon) return res.status(404).json({message: `${pokemonName} not found in ${teamName} in ${player === 1 ? "my boxes": "enemy boxes"}`})

    res.status(200).json({
        message: `Successfully found ${pokemonName}`, 
        'pokemon': pokemon }); 
} 

const deletePokemon = async (req, res) => {
    // needs a pokemon name
    const player = Number(req.params.player);
    if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})

    const teamName = req.params.teamName;
    const pokemonName =  req.params.pokemonName; 
    const currentBox = await loadTeams(player); 
    const currentTeam = await findTeam(player, teamName);

    if (!currentTeam[pokemonName]) return res.status(404).json({message: `${pokemonName} not found in ${teamName} in ${player === 1 ? "my box": "the enemy box"}`})

    const oldPokemon = currentTeam[pokemonName];
    delete currentTeam[pokemonName];
    currentBox[teamName] = currentTeam;
    await saveTeams(player, currentBox);

    return res.status(200).json({
            message: `${pokemonName} successfully deleted from ${teamName} in ${player === 1 ? "my box" : "the enemy box"}`, 
            deletedPokemon: oldPokemon,
            updatedBox: Object.keys(await loadTeams(player))
        });

} 

const updatePokemon = async (req, res) => {
    try{ 
        // needs pokemon import text
        const player = Number(req.params.player);
        if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})

        const teamName = req.params.teamName;
        const pokemonName  = req.params.pokemonName;
        const { pokemonData } = req.body; 
        const currentBox = await loadTeams(player); 
        const currentTeam = await findTeam(player, teamName)

        if (!currentTeam[pokemonName]) return res.status(404).json({message: `${pokemonName} doesn't exists in ${teamName} in ${player === 1 ? "my box" : "the enemy box"}`})
        const updatedPokemon = await createPokemon(pokemonData, player); 


        currentTeam[pokemonName] = updatedPokemon; 
        currentBox[teamName] = currentTeam;
        await saveTeams(player, currentBox); 

        res.status(200).json({
            message: `${updatedPokemon.name} was successfully updated in ${teamName} in ${player === 1 ? "my box" : "the enemy box"}`, 
            theUpdatedPokemon: updatedPokemon, 
            updatedBox: Object.keys(await loadTeams(player))
        });


    } catch (err) {
        res.status(err.statusCode || 500).json({message: err.message || `failed to add pokemon to ${teamName}`})
    }
}

const clearAllPokemon = async (req, res) => {
    const player = Number(req.params.player); 
    if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})

    const teamName = req.params.teamName;
    const currentBox = await loadTeams(player); 
    const currentTeam = await findTeam(player, teamName)
    
    currentBox[teamName] = {};
    await saveTeams(player, currentBox); 

    res.status(200).json({
        message: `${teamName} in ${player === 1 ? "my box" : "the enemy box"} was successfully cleared`, 
        "current team names": Object.keys(loadTeams(player)),
        updatedBox: await loadTeams(player)
    });
}



module.exports = { addPokemon, findPokemon, deletePokemon, updatePokemon, clearAllPokemon }; 