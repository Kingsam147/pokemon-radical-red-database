const express = require('express'); 
const router = express.Router(); 
const { getOtherForms, changeForm, resetForm } = require('../../battling/activePokemonControllers');

router.route('/:player') 
    .get(getOtherForms)
    .put(resetForm)

router.route('/:player/:newFormName')
    .put(changeForm)

module.exports = router;