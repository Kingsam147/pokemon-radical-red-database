const { createPokemon, hasDuplicate } = require('../Services/pokemonService');
const { checkMega, addMega } = require('../Services/formService');
const {saveMyBoxes, findMyBox, loadMyBoxes} = require('../Config/jsonOptions');

const getAllMyBoxes = async (req, res) => {
    res.status(200).json({
        message: "Successfully found my boxes",
        allBoxes: await loadMyBoxes()
    });
}

const findBox = async (req, res) => {
    const index = Number(req.params.index);
    const allBoxes = await loadMyBoxes(); 
    res.status(200).json({
        message: "Successfuly found my box",
        box: allBoxes[index],
        'allBoxes': allBoxes
    })
}

const addBox = async (req, res) => {
    const allBoxes = await loadMyBoxes(); 
    allBoxes.push({});

    await saveMyBoxes(allBoxes);

    return res.status(200).json({
        message: "a box was successfully added", 
        allBoxes: await loadMyBoxes()
    });
}

const removeBox = async (req, res) => {
        
    const index = Number(req.params.index);

    const allBoxes = await loadMyBoxes(); 
    allBoxes.splice(index, 1);
    await saveMyBoxes(allBoxes);
    
    return res.status(200).json({
        message: "removed the box", 
        allBoxes: await loadMyBoxes()
    });
}

const addToBox = async (req, res) => {
    try {

        const index = Number(req.params.index);

        const { pokemonData } = req.body; 
        const allBoxes = await loadMyBoxes();
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
        await saveMyBoxes(allBoxes);

        if (duplicates.length > 0) {
            return res.status(409).json({
                partialSuccess: `still added ${validPokemon.map(p => p.name).join(', ')} to my box`,
                error: `${duplicates.map(pokemon => pokemon.name).join(', ')} already exists in my box`, 
                addedPokemon: validPokemon,
                updatedBox: currentBox,
                allBoxes: await loadMyBoxes()
            })
        }

        // assuming that there were no duplicates then it returns a complete success message
        return res.status(201).json({
            message: `Successfully added ${newPokemons.map(p => p.name)} to my box`, 
            addedPokemon: validPokemon,
            updatedBox: currentBox,
            allBoxes: await loadMyBoxes()
        }); 

    } catch (err) {
        return res.status(err.statusCode || 500).json({message: err.message || "Failed to add pokemon, double check the imported text"})
    }

} 

const findInBox = async (req, res) => {
    
    const index = Number(req.params.index);
    const pokemonName =  req.params.pokemonName;
    const allBoxes = await loadMyBoxes();
    const currentBox = allBoxes[index];

    const pokemon = currentBox[pokemonName];

    if (!pokemon) return res.status(404).json({message: `${pokemonName} not found in my box`})

    res.status(200).json({
        message: `Successfully found ${pokemonName}`, 
        'pokemon': pokemon }); 
} 

const deleteInBox = async (req, res) => {

    const index = Number(req.params.index);
    const pokemonName =  req.params.pokemonName; 
    const allBoxes = await loadMyBoxes();
    const currentBox = allBoxes[index];

    if (!currentBox[pokemonName]) return res.status(404).json({message: `${pokemonName} not found in my box`})

    const oldPokemon = currentBox[pokemonName];
    delete currentBox[pokemonName];
    allBoxes[index] = currentBox;
    await saveMyBoxes(allBoxes);

    return res.status(200).json({
            message: `${pokemonName} successfully deleted from my box`, 
            deletedPokemon: oldPokemon,
            updatedBox: currentBox, 
            allBoxes: await loadMyBoxes()
        });

}

const updateInBox = async (req, res) => {
    try{ 
            
        const index = Number(req.params.index);

        const pokemonName  = req.params.pokemonName;
        const { pokemonData } = req.body; 
        const currentBox = await findMyBox(index); 

        if (!currentBox[pokemonName]) return res.status(404).json({message: `${pokemonName} doesn't exists in my box`})
        const updatedPokemon = await createPokemon(pokemonData, 1); 


        currentBox[pokemonName] = updatedPokemon; 
        allBoxes[index] = currentBox; 
        await saveMyBoxes(allBoxes); 

        res.status(200).json({
            message: `${updatedPokemon.name} was successfully updated in my box`, 
            theUpdatedPokemon: updatedPokemon, 
            updatedBox: Object.keys(await myBox()), 
            allBoxes: await loadMyBoxes()
        });


    } catch (err) {
        res.status(err.statusCode || 500).json({message: err.message || `failed to add pokemon to ${teamName}`})
    }
}

const clearMyBox = async (req, res) => {
        
    const index = Number(req.params.index);
    const allBoxes = await loadMyBoxes(); 
    allBoxes[index] = {};
    await saveMyBoxes(allBoxes); 

    res.status(200).json({
        message: `my box was successfully cleared`, 
        updatedBox: allBoxes[index], 
        allBoxes: await loadMyBoxes()
    });
}

const clearMyBoxes = async (req, res) => {
    await saveMyBoxes([]); 

    return res.status(200).json({
        message: `All my boxes have been successfully cleared`,
        allBoxes: await loadMyBoxes()
    });
}

module.exports = { getAllMyBoxes, findBox, addBox, removeBox, addToBox, findInBox, deleteInBox, updateInBox, clearMyBox, clearMyBoxes }