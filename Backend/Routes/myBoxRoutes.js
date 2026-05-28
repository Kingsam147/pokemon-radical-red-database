const express = require('express'); 
const router = express.Router(); 

const { getAllMyBoxes, findBox, addBox, removeBox, 
    addToBox, findInBox, deleteInBox, updateInBox, clearMyBox, 
    clearMyBoxes} 
    = require('../Controllers/myBoxControllers');

router.route('/')
    .get(getAllMyBoxes)
    .post(addBox)
    .delete(clearMyBoxes)

router.route('/:index')
    .get(findBox)
    .post(addToBox)
    .delete(removeBox)
    .put(clearMyBox)


router.route('/:index/:pokemonName')
    .get(findInBox)
    .delete(deleteInBox)
    .patch(updateInBox)

module.exports = router; 