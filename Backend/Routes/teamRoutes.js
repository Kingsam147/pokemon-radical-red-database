const express = require('express'); 
const router = express.Router(); 
const { getTeam, getAllTeams, addTeam, removeTeam, removeAllTeams, saveFullTeam } = require('../Controllers/teamControllers')

router.route('/:player/:teamName')
    .get(getTeam)
    .put(saveFullTeam)
    .delete(removeTeam)

router.route('/:player')
    .get(getAllTeams)
    .post(addTeam)
    .delete(removeAllTeams)


module.exports = router;