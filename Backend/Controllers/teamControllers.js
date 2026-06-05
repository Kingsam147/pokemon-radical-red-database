const { loadTeams, saveTeams, findTeam } = require("../Config/jsonOptions");
const logger = require('../infrastructure/logger/logger');
const { USER_ACTION_EVENTS } = require('../infrastructure/logger/events');


const getTeam = async (req, res) => {
    try {
        const { userId } = req;
        const player = Number(req.params.player);
        if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})

        const teamName = req.params.teamName;
        const trainer = await findTeam(player, teamName, userId);
        const team = {};
        for (const [key, value] of Object.entries(trainer)) {
            if (key !== 'trainerInfo') team[key] = value;
        }

        return res.status(200).json({teamName: `${teamName}`, trainerInfo: `${trainer.trainerInfo}`, team});
    } catch (err) {
        return res.status(404).json({ message: err.message });
    }
}

const getAllTeams = async (req, res) => {
    try {
        const { userId } = req;
        const player = Number(req.params.player);
        if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`});

        const allTeams = await loadTeams(player, userId);

        return res.status(200).json({allTeams: allTeams});
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

const addTeam = async (req, res) => {
    try {
        const { userId } = req;
        const player = Number(req.params.player);
        if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})

        const teamName = req.body.teamName;
        const allTeams = await loadTeams(player, userId);

        if (teamName in allTeams) return res.status(400).json({message: `${teamName} already exists ${player === 1 ? "in my box" : " among the enemy teams"}`})
        allTeams[teamName] = {};
        await saveTeams(player, userId, allTeams);

        logger.info(USER_ACTION_EVENTS.TEAM_CREATED, { userId, teamName, player });
        return res.status(200).json({
            message: `Created ${teamName} in ${player === 1 ? "my box" : " the enemy box"}`,
            teamName: teamName,
            currentBox: await loadTeams(player, userId)
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

const removeTeam = async (req, res) => {
    try {
        const { userId } = req;
        const player = Number(req.params.player);
        if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})

        const teamName = req.params.teamName;
        const currentBox = await loadTeams(player, userId);

        if (!(teamName in currentBox)) return res.status(404).json({message: `couldn't find ${teamName} ${player === 1 ? "in my box" : " among the enemy teams"}`})

        delete currentBox[teamName];
        await saveTeams(player, userId, currentBox);

        logger.info(USER_ACTION_EVENTS.TEAM_DELETED, { userId, teamName, player });
        return res.status(200).json({
            message: `Successfully deleted ${teamName} in ${player === 1 ? "my box" : " the enemy box"}`,
            teamName: teamName,
            currentBox: await loadTeams(player, userId)
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

const removeAllTeams = async (req, res) => {
    try {
        const { userId } = req;
        const player = Number(req.params.player);
        if (player !== 1 && player !== 2) return res.status(400).json({message: `player variable must be a 1 or 2 not ${player}`})
        await saveTeams(player, userId, {});

        logger.info(USER_ACTION_EVENTS.TEAM_CLEARED_ALL, { userId, player });
        return res.status(200).json({message: `${player === 1 ? "All my teams" : "All the enemy teams"} have been cleared`, currentBox: await loadTeams(player, userId)})
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

const saveFullTeam = async (req, res) => {
    try {
        const { userId } = req;
        const player = Number(req.params.player);
        if (player !== 1 && player !== 2) return res.status(400).json({ message: `player variable must be a 1 or 2 not ${player}` });

        const teamName = req.params.teamName;
        const { bench } = req.body;

        if (!Array.isArray(bench)) return res.status(400).json({ message: 'bench must be an array' });

        const allTeams = await loadTeams(player, userId);
        allTeams[teamName] = bench;
        await saveTeams(player, userId, allTeams);

        logger.info(USER_ACTION_EVENTS.TEAM_SAVED, { userId, teamName, player, pokemonCount: bench.length });
        return res.status(200).json({
            message: `Saved team ${teamName}`,
            currentBox: await loadTeams(player, userId)
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports = { getTeam, getAllTeams, addTeam, removeTeam, removeAllTeams, saveFullTeam }