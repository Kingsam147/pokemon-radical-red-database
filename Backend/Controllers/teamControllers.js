const { loadTeams, saveTeams, findTeam } = require("../Config/jsonOptions");


const getTeam = (req, res) => {
    const player = Number(req.params.player); 
    if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})

    const teamName = req.params.teamName;

    const trainer = findTeam(player, teamName)
    const team = {}
    for (const [key, value] of Object.entries(trainer)) {
        if (key !== 'trainerInfo') return value
    }

    return res.status(200).json({teamName: `${teamName}`, 'trainerInfo': `${trainer.trainerInfo}`, "team": team}); 
}

const getAllTeams = async (req, res) => {
    const player = Number(req.params.player); 
    if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`});
    
    const allTeams = await loadTeams(player);

    return res.status(200).json({allTeams: allTeams}); 
}

const addTeam = async (req, res) => {
    const player = Number(req.params.player); 
    if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})

    const teamName = req.body.teamName; 
    const allTeams = await loadTeams(player); 

    if (teamName in allTeams) return res.status(400).json({message: `${teamName} already exists ${player === 1 ? "in my box" : " among the enemy teams"}`})
    allTeams[teamName] = {}; 
    await saveTeams(player, allTeams);

    return res.status(200).json({
        message: `Created ${teamName} in ${player === 1 ? "my box" : " the enemy box"}`, 
        teamName: teamName, 
        currentBox: await loadTeams(player)
    });
}

const removeTeam = async (req, res) => {
    const player = Number(req.params.player); 
    if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})

    const teamName = req.params.teamName; 
    const currentBox = await loadTeams(player); 

    if (!(teamName in currentBox)) return res.status(400).json({message: `couldn't find ${teamName} ${player === 1 ? "in my box" : " among the enemy teams"}`})
    
    delete currentBox[teamName]
    await saveTeams(player, currentBox);

    return res.status(200).json({
        message: `Successfully deleted ${teamName} in ${player === 1 ? "my box" : " the enemy box"}`, 
        teamName: teamName,
        currentBox: await loadTeams(player)
    });
}

const removeAllTeams = async (req, res) => {
    const player = Number(req.params.player); 
    if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})
    await saveTeams(player, {});

    return res.status(200).json({message: `${player === 1 ? "All my teams" : "All the enemy teams"} have been cleared`, currentBox: await loadTeams(player)})
}

module.exports = { getTeam, getAllTeams, addTeam, removeTeam, removeAllTeams }