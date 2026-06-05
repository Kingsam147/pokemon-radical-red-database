const { createPokemon, hasDuplicate } = require('../Services/pokemonService');
const { checkMega, addMega } = require('../Services/formService');
const { loadTeams, saveTeams, findTeam } = require("../Config/jsonOptions");


const addPokemon = async (req, res) => {
    try {
        const { userId } = req;
        const player = Number(req.params.player);
        if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})

        const teamName = req.params.teamName;
        const { pokemonData } = req.body;
        const currentBox = await loadTeams(player, userId);
        const currentTeam = await findTeam(player, teamName, userId);

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

        currentBox[teamName] = currentTeam;
        await saveTeams(player, userId, currentBox);

        if (player === 1 && duplicates.length > 0) {
            const updated = await loadTeams(player, userId);
            return res.status(409).json({
                partialSuccess: `still added ${validPokemon.map(p => p.name).join(', ')} to ${player === 1 ? `${teamName} in my box` : `${teamName} in enemy box`}`,
                error: `${duplicates.map(pokemon => pokemon.name).join(', ')} already exists in ${teamName}`,
                updatedTeam: updated[teamName]
            })
        }

        const updated = await loadTeams(player, userId);
        return res.status(201).json({
            message: `Successfully added ${newPokemons.map(p => p.name)} to ${player === 1 ? `${teamName} my box` : `${teamName} enemy box`}`,
            addedPokemon: validPokemon,
            updatedTeam: updated[teamName]
        });

    } catch (err) {
        return res.status(err.statusCode || 500).json({message: err.message || "Failed to add pokemon, double check the imported text"})
    }

} 

const findPokemon = async (req, res) => {
    const { userId } = req;
    const player = Number(req.params.player);
    if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})

    const teamName = req.params.teamName;
    const pokemonName = req.params.pokemonName;
    const currentTeam = await findTeam(player, teamName, userId);

    const pokemon = currentTeam[pokemonName];

    if (!pokemon) return res.status(404).json({message: `${pokemonName} not found in ${teamName} in ${player === 1 ? "my boxes": "enemy boxes"}`})

    res.status(200).json({
        message: `Successfully found ${pokemonName}`, 
        'pokemon': pokemon }); 
} 

const deletePokemon = async (req, res) => {
    const { userId } = req;
    const player = Number(req.params.player);
    if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})

    const teamName = req.params.teamName;
    const pokemonName = req.params.pokemonName;
    const currentBox = await loadTeams(player, userId);
    const currentTeam = await findTeam(player, teamName, userId);

    if (!currentTeam[pokemonName]) return res.status(404).json({message: `${pokemonName} not found in ${teamName} in ${player === 1 ? "my box": "the enemy box"}`})

    const oldPokemon = currentTeam[pokemonName];
    delete currentTeam[pokemonName];
    currentBox[teamName] = currentTeam;
    await saveTeams(player, userId, currentBox);

    return res.status(200).json({
        message: `${pokemonName} successfully deleted from ${teamName} in ${player === 1 ? "my box" : "the enemy box"}`,
        deletedPokemon: oldPokemon,
        updatedBox: Object.keys(await loadTeams(player, userId))
    });

}

const updatePokemon = async (req, res) => {
    try {
        const { userId } = req;
        const player = Number(req.params.player);
        if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})

        const teamName = req.params.teamName;
        const pokemonName = req.params.pokemonName;
        const { pokemonData } = req.body;
        const currentBox = await loadTeams(player, userId);
        const currentTeam = await findTeam(player, teamName, userId);

        if (!currentTeam[pokemonName]) return res.status(404).json({message: `${pokemonName} doesn't exists in ${teamName} in ${player === 1 ? "my box" : "the enemy box"}`})
        const updatedPokemon = await createPokemon(pokemonData, player);

        currentTeam[pokemonName] = updatedPokemon;
        currentBox[teamName] = currentTeam;
        await saveTeams(player, userId, currentBox);

        res.status(200).json({
            message: `${updatedPokemon.name} was successfully updated in ${teamName} in ${player === 1 ? "my box" : "the enemy box"}`,
            theUpdatedPokemon: updatedPokemon,
            updatedBox: Object.keys(await loadTeams(player, userId))
        });

    } catch (err) {
        res.status(err.statusCode || 500).json({message: err.message || `failed to update pokemon in ${req.params.teamName}`})
    }
}

const clearAllPokemon = async (req, res) => {
    const { userId } = req;
    const player = Number(req.params.player);
    if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})

    const teamName = req.params.teamName;
    const currentBox = await loadTeams(player, userId);
    await findTeam(player, teamName, userId);

    currentBox[teamName] = {};
    await saveTeams(player, userId, currentBox);

    res.status(200).json({
        message: `${teamName} in ${player === 1 ? "my box" : "the enemy box"} was successfully cleared`,
        updatedBox: await loadTeams(player, userId)
    });
}



module.exports = { addPokemon, findPokemon, deletePokemon, updatePokemon, clearAllPokemon }; 