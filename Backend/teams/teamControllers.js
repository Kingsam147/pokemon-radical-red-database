const TeamRepository = require('./TeamRepository');
const logger = require('../infrastructure/logger/logger');
const { USER_ACTION_EVENTS } = require('../infrastructure/logger/events');

const hydrateTeamsMap = (teams) => {
  const result = {};
  for (const [name, team] of Object.entries(teams)) {
    result[name] = Array.isArray(team) ? team : team.toJSON();
  }
  return result;
};

const getTeam = async (req, res) => {
  try {
    const { userId } = req;
    const player = Number(req.params.player);
    if (player !== 1 && player !== 2)
      return res.status(400).json({ message: `player variable must be a 1 or 2 not ${player}` });

    const teamName = req.params.teamName;
    const team = await TeamRepository.findTeam(player, teamName, userId);
    if (Array.isArray(team)) {
      return res.status(200).json({ teamName, trainerInfo: 'undefined', team });
    }
    const trainerInfo = team.trainerInfo;
    const pokemonMap = {};
    team.listPokemon().forEach((entity) => {
      pokemonMap[entity.name] = entity.toJSON();
    });

    return res
      .status(200)
      .json({ teamName: `${teamName}`, trainerInfo: `${trainerInfo}`, team: pokemonMap });
  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
};

const getAllTeams = async (req, res) => {
  try {
    const { userId } = req;
    const player = Number(req.params.player);
    if (player !== 1 && player !== 2)
      return res.status(400).json({ message: `player variable must be a 1 or 2 not ${player}` });

    const teams = await TeamRepository.loadAllTeams(player, userId);
    return res.status(200).json({ allTeams: hydrateTeamsMap(teams) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const addTeam = async (req, res) => {
  try {
    const { userId } = req;
    const player = Number(req.params.player);
    if (player !== 1 && player !== 2)
      return res.status(400).json({ message: `player variable must be a 1 or 2 not ${player}` });

    const teamName = req.body.teamName;
    const teams = await TeamRepository.addTeam(player, userId, teamName);

    logger.info(USER_ACTION_EVENTS.TEAM_CREATED, { userId, teamName, player });
    return res.status(200).json({
      message: `Created ${teamName} in ${player === 1 ? 'my box' : ' the enemy box'}`,
      teamName,
      currentBox: hydrateTeamsMap(teams),
    });
  } catch (err) {
    if (err.code === 'DUPLICATE_TEAM') return res.status(400).json({ message: err.message });
    return res.status(500).json({ message: err.message });
  }
};

const removeTeam = async (req, res) => {
  try {
    const { userId } = req;
    const player = Number(req.params.player);
    if (player !== 1 && player !== 2)
      return res.status(400).json({ message: `player variable must be a 1 or 2 not ${player}` });

    const teamName = req.params.teamName;
    const teams = await TeamRepository.removeTeam(player, userId, teamName);

    logger.info(USER_ACTION_EVENTS.TEAM_DELETED, { userId, teamName, player });
    return res.status(200).json({
      message: `Successfully deleted ${teamName} in ${player === 1 ? 'my box' : ' the enemy box'}`,
      teamName,
      currentBox: hydrateTeamsMap(teams),
    });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ message: err.message });
    return res.status(500).json({ message: err.message });
  }
};

const removeAllTeams = async (req, res) => {
  try {
    const { userId } = req;
    const player = Number(req.params.player);
    if (player !== 1 && player !== 2)
      return res.status(400).json({ message: `player variable must be a 1 or 2 not ${player}` });
    await TeamRepository.removeAllTeams(player, userId);

    logger.info(USER_ACTION_EVENTS.TEAM_CLEARED_ALL, { userId, player });
    return res.status(200).json({
      message: `${player === 1 ? 'All my teams' : 'All the enemy teams'} have been cleared`,
      currentBox: hydrateTeamsMap(await TeamRepository.loadAllTeams(player, userId)),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const saveFullTeam = async (req, res) => {
  try {
    const { userId } = req;
    const player = Number(req.params.player);
    if (player !== 1 && player !== 2)
      return res.status(400).json({ message: `player variable must be a 1 or 2 not ${player}` });

    const teamName = req.params.teamName;
    const { bench } = req.body;
    if (!Array.isArray(bench)) return res.status(400).json({ message: 'bench must be an array' });

    await TeamRepository.replaceTeamContents(player, userId, teamName, bench);

    logger.info(USER_ACTION_EVENTS.TEAM_SAVED, {
      userId,
      teamName,
      player,
      pokemonCount: bench.length,
    });
    return res.status(200).json({
      message: `Saved team ${teamName}`,
      currentBox: hydrateTeamsMap(await TeamRepository.loadAllTeams(player, userId)),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { getTeam, getAllTeams, addTeam, removeTeam, removeAllTeams, saveFullTeam };
