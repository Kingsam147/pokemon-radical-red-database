const TeamRepository = require('./TeamRepository');
const TeamEntity = require('./TeamEntity');
const createFromImportText = require('../pokemon/createFromImportText');
const { checkMega, addMega } = require('../forms/checkMega');

const validatePlayer = (player, res) => {
  if (player !== 1 && player !== 2) {
    res.status(400).json({ message: `player variable must be a 1 or 2 not ${player}` });
    return false;
  }
  return true;
};

const addPokemon = async (req, res) => {
  try {
    const { userId } = req;
    const player = Number(req.params.player);
    if (!validatePlayer(player, res)) return;

    const teamName = req.params.teamName;
    const { pokemonData } = req.body;

    const newEntities = pokemonData
      .trim()
      .split(/\n\s*\n/)
      .map((pokemonText) =>
        checkMega(pokemonText) ? addMega(pokemonText, player) : createFromImportText(pokemonText, player),
      );

    const team = await TeamRepository.findTeam(player, teamName, userId);
    const existingTeam = Array.isArray(team) ? null : team;

    // TeamRepository.savePokemon re-reads and re-writes the whole team on every call and
    // version-checks against what it finds. If the same species is pasted twice in one batch,
    // a naive loop would save the first occurrence, then have the second occurrence collide
    // with the version the first one just wrote -- surfacing as a 409 "concurrent edit"
    // conflict that has nothing to do with concurrency. Claim each name at most once per
    // batch and route repeats into `duplicates` instead, mirroring the fix already applied to
    // boxControllers.js: addToBox for the same failure mode.
    const claimedNames = new Set();
    const duplicates = [];
    const toSave = [];
    newEntities.forEach((entity) => {
      const alreadyInTeam = existingTeam !== null && existingTeam.hasPokemon(entity.name);
      if (alreadyInTeam || claimedNames.has(entity.name)) {
        duplicates.push(entity);
      } else {
        claimedNames.add(entity.name);
        toSave.push(entity);
      }
    });

    const saved = [];
    for (const entity of toSave) {
      saved.push(await TeamRepository.savePokemon(entity, teamName, entity.name, userId));
    }

    const updated = await TeamRepository.findTeam(player, teamName, userId);

    if (player === 1 && duplicates.length > 0) {
      return res.status(409).json({
        partialSuccess: `still added ${saved.map((p) => p.name).join(', ')} to ${teamName} in my box`,
        error: `${duplicates.map((p) => p.name).join(', ')} already exists in ${teamName}`,
        updatedTeam: updated.toJSON(),
      });
    }

    return res.status(201).json({
      message: `Successfully added ${newEntities.map((p) => p.name)} to ${player === 1 ? `${teamName} my box` : `${teamName} enemy box`}`,
      addedPokemon: saved,
      updatedTeam: updated.toJSON(),
    });
  } catch (err) {
    return res.status(err.status || err.statusCode || 500).json({
      message: err.message || 'Failed to add pokemon, double check the imported text',
    });
  }
};

const findPokemon = async (req, res) => {
  const { userId } = req;
  const player = Number(req.params.player);
  if (!validatePlayer(player, res)) return;

  const teamName = req.params.teamName;
  const pokemonName = req.params.pokemonName;
  const team = await TeamRepository.findTeam(player, teamName, userId);
  const entity = Array.isArray(team) ? null : team.getPokemon(pokemonName);

  if (!entity)
    return res.status(404).json({
      message: `${pokemonName} not found in ${teamName} in ${player === 1 ? 'my boxes' : 'enemy boxes'}`,
    });

  res.status(200).json({ message: `Successfully found ${pokemonName}`, pokemon: entity.toJSON() });
};

const deletePokemon = async (req, res) => {
  const { userId } = req;
  const player = Number(req.params.player);
  if (!validatePlayer(player, res)) return;

  const teamName = req.params.teamName;
  const pokemonName = req.params.pokemonName;
  const teams = await TeamRepository.loadAllTeams(player, userId);
  const team = teams[teamName];

  if (!team || Array.isArray(team) || !team.hasPokemon(pokemonName))
    return res.status(404).json({
      message: `${pokemonName} not found in ${teamName} in ${player === 1 ? 'my box' : 'the enemy box'}`,
    });

  const removed = team.removePokemon(pokemonName);
  await TeamRepository.saveAllTeams(player, userId, teams);

  return res.status(200).json({
    message: `${pokemonName} successfully deleted from ${teamName} in ${player === 1 ? 'my box' : 'the enemy box'}`,
    deletedPokemon: removed.toJSON(),
    updatedBox: Object.keys(await TeamRepository.loadAllTeams(player, userId)),
  });
};

const updatePokemon = async (req, res) => {
  try {
    const { userId } = req;
    const player = Number(req.params.player);
    if (!validatePlayer(player, res)) return;

    const teamName = req.params.teamName;
    const pokemonName = req.params.pokemonName;
    const { pokemonData } = req.body;
    const team = await TeamRepository.findTeam(player, teamName, userId);

    if (Array.isArray(team) || !team.hasPokemon(pokemonName))
      return res.status(404).json({
        message: `${pokemonName} doesn't exists in ${teamName} in ${player === 1 ? 'my box' : 'the enemy box'}`,
      });

    const updatedEntity = createFromImportText(pokemonData, player);
    const saved = await TeamRepository.savePokemon(updatedEntity, teamName, pokemonName, userId);

    res.status(200).json({
      message: `${saved.name} was successfully updated in ${teamName} in ${player === 1 ? 'my box' : 'the enemy box'}`,
      theUpdatedPokemon: saved,
      updatedBox: Object.keys(await TeamRepository.loadAllTeams(player, userId)),
    });
  } catch (err) {
    res.status(err.status || err.statusCode || 500).json({
      message: err.message || `failed to update pokemon in ${req.params.teamName}`,
    });
  }
};

const clearAllPokemon = async (req, res) => {
  const { userId } = req;
  const player = Number(req.params.player);
  if (!validatePlayer(player, res)) return;

  const teamName = req.params.teamName;
  const teams = await TeamRepository.loadAllTeams(player, userId);
  await TeamRepository.findTeam(player, teamName, userId);

  teams[teamName] = new TeamEntity([]);
  await TeamRepository.saveAllTeams(player, userId, teams);

  res.status(200).json({
    message: `${teamName} in ${player === 1 ? 'my box' : 'the enemy box'} was successfully cleared`,
    updatedBox: await TeamRepository.loadAllTeams(player, userId),
  });
};

module.exports = { addPokemon, findPokemon, deletePokemon, updatePokemon, clearAllPokemon };
