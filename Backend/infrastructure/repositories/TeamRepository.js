const { loadTeams, saveTeams } = require('../../Config/jsonOptions');

const savePokemon = async (entity, teamName, pokemonName, userId) => {
  if (entity.userId !== undefined && entity.userId !== userId) {
    const forbidden = new Error('Forbidden: cannot save a Pokémon that belongs to another user');
    forbidden.status = 403;
    throw forbidden;
  }

  const teams = await loadTeams(entity.player, userId);

  if (!teams[teamName]) throw new Error(`Team "${teamName}" not found`);

  const stored = teams[teamName][pokemonName];

  if (stored?.version !== undefined && stored.version !== entity.version) {
    const conflict = new Error(
      `Conflict: ${pokemonName} was modified after this draft was opened (expected v${entity.version}, found v${stored.version}). Re-activate to get the latest version.`
    );
    conflict.status = 409;
    throw conflict;
  }

  teams[teamName][pokemonName] = { ...entity, version: (entity.version ?? 0) + 1 };
  await saveTeams(entity.player, userId, teams);
};

module.exports = { savePokemon };
