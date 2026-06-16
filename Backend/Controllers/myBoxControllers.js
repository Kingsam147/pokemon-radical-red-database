const { createPokemon, hasDuplicate } = require('../Services/pokemonService');
const { checkMega, addMega } = require('../Services/formService');
const { saveMyBoxes, findMyBox, loadMyBoxes, loadBox, invalidateBoxCache, invalidateAllBoxCache, getCachedBoxCount, setBoxCountCache, invalidateBoxCountCache, preWarmBoxCache } = require('../Config/jsonOptions');

const parseBoxIndex = (param) => {
    const index = Number(param);
    return Number.isInteger(index) && index >= 0 ? index : null;
};
const logger = require('../infrastructure/logger/logger');
const { USER_ACTION_EVENTS } = require('../infrastructure/logger/events');

const getAllMyBoxes = async (req, res) => {
    const { userId } = req;
    res.status(200).json({
        message: "Successfully found my boxes",
        allBoxes: await loadMyBoxes(userId)
    });
}

const getBoxCount = async (req, res) => {
    const { userId } = req;

    const cached = await getCachedBoxCount(userId);
    if (cached !== null) {
        return res.status(200).json({ count: cached });
    }

    let allBoxes = await loadMyBoxes(userId);
    if (allBoxes.length === 0) {
        allBoxes.push({});
        await saveMyBoxes(userId, allBoxes);
        logger.info(USER_ACTION_EVENTS.BOX_CREATED, { userId, newBoxIndex: 0, reason: 'auto_init' });
    }

    await setBoxCountCache(userId, allBoxes.length);
    preWarmBoxCache(userId, allBoxes).catch(() => {});

    return res.status(200).json({ count: allBoxes.length });
}

const findBox = async (req, res) => {
    const { userId } = req;
    const index = parseBoxIndex(req.params.index);
    if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });
    const box = await loadBox(userId, index);
    if (!box) return res.status(404).json({ message: `Box ${index} not found` });
    res.status(200).json({
        message: "Successfully found my box",
        box,
    })
}

const addBox = async (req, res) => {
    const { userId } = req;
    const allBoxes = await loadMyBoxes(userId);
    allBoxes.push({});

    await saveMyBoxes(userId, allBoxes);
    await invalidateBoxCountCache(userId);

    logger.info(USER_ACTION_EVENTS.BOX_CREATED, { userId, newBoxIndex: allBoxes.length - 1 });
    return res.status(200).json({
        message: "a box was successfully added",
        count: allBoxes.length
    });
}

const removeBox = async (req, res) => {
    const { userId } = req;
    const index = parseBoxIndex(req.params.index);
    if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });

    const allBoxes = await loadMyBoxes(userId);
    allBoxes.splice(index, 1);
    if (allBoxes.length === 0) {
        allBoxes.push({});
        logger.info(USER_ACTION_EVENTS.BOX_CREATED, { userId, newBoxIndex: 0, reason: 'auto_restore' });
    }
    await saveMyBoxes(userId, allBoxes);
    await invalidateAllBoxCache(userId);
    await invalidateBoxCountCache(userId);

    const newActiveIndex = Math.min(index, allBoxes.length - 1);
    logger.info(USER_ACTION_EVENTS.BOX_REMOVED, { userId, removedIndex: index });
    return res.status(200).json({
        message: "removed the box",
        count: allBoxes.length,
        newActiveIndex
    });
}

const addToBox = async (req, res) => {
    try {

        const { userId } = req;
        const index = parseBoxIndex(req.params.index);
        if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });

        const { pokemonData } = req.body;
        const allBoxes = await loadMyBoxes(userId);
        if (!allBoxes[index]) return res.status(404).json({ message: `Box ${index} not found` });
        const currentBox = allBoxes[index];

        const newPokemons = pokemonData
            .trim()
            .split(/\n\s*\n/)
            .map(pokemonText => checkMega(pokemonText) ? addMega(pokemonText, 1) : createPokemon(pokemonText, 1));

        const duplicates = newPokemons.filter(pokemon => hasDuplicate(pokemon.name, currentBox));
        const validPokemon = newPokemons.filter(pokemon => !hasDuplicate(pokemon.name, currentBox));

        validPokemon.forEach(pokemon => {
            currentBox[pokemon.name] = pokemon;
        });

        allBoxes[index] = currentBox;
        await saveMyBoxes(userId, allBoxes);
        await invalidateBoxCache(userId, index);

        if (duplicates.length > 0) {
            logger.warn(USER_ACTION_EVENTS.POKEMON_IMPORTED, {
                userId,
                boxIndex: index,
                imported: validPokemon.map(p => p.name),
                skippedDuplicates: duplicates.map(p => p.name),
                partialSuccess: true,
            });
            return res.status(409).json({
                partialSuccess: `still added ${validPokemon.map(p => p.name).join(', ')} to my box`,
                error: `${duplicates.map(pokemon => pokemon.name).join(', ')} already exists in my box`,
                addedPokemon: validPokemon,
                updatedBox: currentBox,
            })
        }

        logger.info(USER_ACTION_EVENTS.POKEMON_IMPORTED, {
            userId,
            boxIndex: index,
            imported: newPokemons.map(p => p.name),
            count: newPokemons.length,
        });
        return res.status(201).json({
            message: `Successfully added ${newPokemons.map(p => p.name)} to my box`,
            addedPokemon: validPokemon,
            updatedBox: currentBox,
        });

    } catch (err) {
        return res.status(err.statusCode || 500).json({message: err.message || "Failed to add pokemon, double check the imported text"})
    }

}

const findInBox = async (req, res) => {
    const { userId } = req;
    const index = parseBoxIndex(req.params.index);
    if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });
    const pokemonName = req.params.pokemonName;
    const allBoxes = await loadMyBoxes(userId);
    if (!allBoxes[index]) return res.status(404).json({ message: `Box ${index} not found` });
    const currentBox = allBoxes[index];

    const pokemon = currentBox[pokemonName];

    if (!pokemon) return res.status(404).json({message: `${pokemonName} not found in my box`})

    res.status(200).json({
        message: `Successfully found ${pokemonName}`, 
        'pokemon': pokemon }); 
} 

const deleteInBox = async (req, res) => {
    const { userId } = req;
    const index = parseBoxIndex(req.params.index);
    if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });
    const pokemonName = req.params.pokemonName;
    const allBoxes = await loadMyBoxes(userId);
    if (!allBoxes[index]) return res.status(404).json({ message: `Box ${index} not found` });
    const currentBox = allBoxes[index];

    if (!currentBox[pokemonName]) return res.status(404).json({message: `${pokemonName} not found in my box`})

    const oldPokemon = currentBox[pokemonName];
    delete currentBox[pokemonName];
    allBoxes[index] = currentBox;
    await saveMyBoxes(userId, allBoxes);
    await invalidateBoxCache(userId, index);

    logger.info(USER_ACTION_EVENTS.POKEMON_DELETED, { userId, boxIndex: index, pokemonName });
    return res.status(200).json({
        message: `${pokemonName} successfully deleted from my box`,
        deletedPokemon: oldPokemon,
        updatedBox: currentBox,
    });

}

const updateInBox = async (req, res) => {
    try {
        const { userId } = req;
        const index = parseBoxIndex(req.params.index);
        if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });

        const pokemonName = req.params.pokemonName;
        const { pokemonData } = req.body;
        const currentBox = await findMyBox(index);

        if (!currentBox[pokemonName]) return res.status(404).json({message: `${pokemonName} doesn't exists in my box`})
        const updatedPokemon = await createPokemon(pokemonData, 1);

        const allBoxes = await loadMyBoxes(userId);
        currentBox[pokemonName] = updatedPokemon;
        allBoxes[index] = currentBox;
        await saveMyBoxes(userId, allBoxes);

        logger.info(USER_ACTION_EVENTS.POKEMON_UPDATED, { userId, boxIndex: index, pokemonName: updatedPokemon.name });
        res.status(200).json({
            message: `${updatedPokemon.name} was successfully updated in my box`,
            theUpdatedPokemon: updatedPokemon,
            allBoxes: await loadMyBoxes(userId)
        });

    } catch (err) {
        res.status(err.statusCode || 500).json({message: err.message || `failed to update pokemon in box`})
    }
}

const clearMyBox = async (req, res) => {
    const { userId } = req;
    const index = parseBoxIndex(req.params.index);
    if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });
    const allBoxes = await loadMyBoxes(userId);
    if (!allBoxes[index]) return res.status(404).json({ message: `Box ${index} not found` });
    allBoxes[index] = {};
    await saveMyBoxes(userId, allBoxes);
    await invalidateBoxCache(userId, index);

    logger.info(USER_ACTION_EVENTS.BOX_CLEARED, { userId, boxIndex: index });
    res.status(200).json({
        message: `my box was successfully cleared`,
        updatedBox: allBoxes[index],
    });
}

const clearMyBoxes = async (req, res) => {
    const { userId } = req;
    await saveMyBoxes(userId, []);

    logger.info(USER_ACTION_EVENTS.BOX_CLEARED_ALL, { userId });
    return res.status(200).json({
        message: `All my boxes have been successfully cleared`,
        allBoxes: await loadMyBoxes(userId)
    });
}

module.exports = { getAllMyBoxes, getBoxCount, findBox, addBox, removeBox, addToBox, findInBox, deleteInBox, updateInBox, clearMyBox, clearMyBoxes }