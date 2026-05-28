const express = require('express'); 
const router = express.Router(); 
const { getTeam, getAllTeams, addTeam, removeTeam, removeAllTeams } = require('../Controllers/teamControllers')

router.route('/:player/:teamName')
    .get(getTeam)
    .delete(removeTeam)

router.route('/:player')
    .get(getAllTeams)
    .post(addTeam)
    .delete(removeAllTeams)


module.exports = router;