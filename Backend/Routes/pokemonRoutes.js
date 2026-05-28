const express = require('express'); 
const router = express.Router(); 
const { addPokemon, findPokemon, deletePokemon, updatePokemon, clearAllPokemon } = require('../Controllers/pokemonControllers.js'); 

router.route('/:player/:teamName')
    .post(addPokemon)
    .delete(clearAllPokemon)

router.route('/:player/:teamName/:pokemonName')
    .get(findPokemon)
    .delete(deletePokemon)
    .patch(updatePokemon)

module.exports = router;  