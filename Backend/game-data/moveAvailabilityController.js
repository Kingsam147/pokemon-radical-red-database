const { getModels } = require('./loadModels');
const { isEggMoves, tutorTable, bannedMoves, leechSeedExceptions, toxicExceptions } = require('./jsOptions');
const allAvaliableMoves = require('../legality/pokemonMovesets');
const legalMovesFilter = require('../legality/legalMoves');
const HydrationService = require('../pokemon/HydrationService');
const { getPreEvolution } = require('./preEvolution');
const { resolveCheckedTMNames } = require('./tmHmList');

const resolveMoveObjects = (moveNames, fromPreEvolution) =>
  moveNames
    .map((name) => HydrationService.getMove(name))
    .filter((move) => move !== null)
    .map((move) => ({ ...move, fromPreEvolution }));

// Builds the level/TM/tutor-filtered movepool for one species entry, reusing the
// same allAvaliableMoves + legalMoves pipeline used for the Pokemon's own pool, so
// pre-evolution species are filtered by identical rules (just their own learnsets).
const buildFilteredPool = (speciesData, level, checkedTMNames, tutorTier, safeTutorTable) => {
  const pool = allAvaliableMoves(speciesData, level, safeTutorTable, tutorTier, checkedTMNames, isEggMoves);
  return legalMovesFilter(speciesData.name, pool, bannedMoves, leechSeedExceptions, toxicExceptions);
};

const getMoveAvailability = (req, res) => {
  try {
    const { species2 } = getModels();
    const { species, form, level, checkedTMs, tutorTier } = req.body;

    if (!species || typeof species !== 'string' || !species2[species]) {
      return res.status(400).json({ message: `"${species}" is not a valid Pokémon species` });
    }
    if (!Number.isInteger(level) || level < 1 || level > 100) {
      return res.status(400).json({ message: 'level must be an integer from 1 to 100' });
    }

    const activeForm = form && species2[form] ? species2[form] : species2[species];
    const checkedTMNames = resolveCheckedTMNames(checkedTMs);

    // tutorTable has no entry for "no tier selected" (frontend default is null), so
    // patch in an empty tier at -1 and fall back to it for any missing/invalid value.
    const safeTutorTable = Object.assign({}, tutorTable, { [-1]: [] });
    const safeTutorTier =
      typeof tutorTier === 'number' && safeTutorTable[tutorTier] !== undefined ? tutorTier : -1;

    const ownPool = buildFilteredPool(activeForm, level, checkedTMNames, safeTutorTier, safeTutorTable);
    const ownPoolSet = new Set(ownPool);

    const preEvolutionNames = getPreEvolution(activeForm.name);
    const inheritedNames = new Set();

    preEvolutionNames.forEach((preEvoName) => {
      const preEvoSpecies = species2[preEvoName];
      if (!preEvoSpecies) return;
      const preEvoPool = buildFilteredPool(preEvoSpecies, level, checkedTMNames, safeTutorTier, safeTutorTable);
      preEvoPool.forEach((moveName) => {
        if (!ownPoolSet.has(moveName)) inheritedNames.add(moveName);
      });
    });

    const allMoves = [
      ...resolveMoveObjects(ownPool, false),
      ...resolveMoveObjects([...inheritedNames], true),
    ];

    return res.status(200).json({ allMoves });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getMoveAvailability };
