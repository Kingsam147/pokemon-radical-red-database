const express = require('express'); 
const router = express.Router(); 
const { getItems, getNatures, getMoves, getTypes, getAbilities, calcStats, getStatuses, getDefenseTypes } = require('../Controllers/miscControllers'); 
const {calculateDamage} = require('../Controllers/damageController');

router.route('/items')
    .get(getItems)

router.route('/natures')
    .get(getNatures)

router.route('/moves')
    .get(getMoves)

router.route('/types')
    .get(getTypes)

router.route('/abilities')
    .get(getAbilities)

router.route('/statuses')
    .get(getStatuses)

router.route('/stats')
    .post(calcStats)

router.route('/damage')
    .post(calculateDamage)

router.route('/calcTypes/:type1/:type2')
    .get(getDefenseTypes)

module.exports = router;