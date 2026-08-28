const { getModels, avaliableTMS } = require('../game-data/loadModels');
const {
  isEggMoves,
  tutorLevel,
  tutorTable,
  bannedMoves,
  leechSeedExceptions,
  toxicExceptions,
  bannedAbilities,
  abilityExceptions,
} = require('../game-data/jsOptions');
const allAvaliableMoves = require('./pokemonMovesets');
const legalMovesFilter = require('./legalMoves');
const legalAbilityFilter = require('./legalAbilities');
const { STAT_KEYS } = require('../pokemon/PokemonEntity');

const validate = (entity, { restrictedMode = false } = {}) => {
  const { species2, natures, items } = getModels();
  const { name, form, nature, item, ability_id, move_ids, EVs, IVs, player, level, allMoves } = entity;
  const errors = [];

  if (!species2[name]) {
    return { valid: false, errors: [`"${name}" is not a valid Pokémon species`] };
  }

  const activeForm = species2[form] ?? species2[name];

  if (!natures[nature]) {
    errors.push(`"${nature}" is not a valid nature`);
  }

  if (item && !items[item]) {
    errors.push(`"${item}" is not a valid item`);
  }

  const resolvedAbilities = activeForm.abilities.map(ab =>
    player === 1 ? legalAbilityFilter(name, ab, bannedAbilities, abilityExceptions) : ab
  );

  if (!resolvedAbilities.includes(ability_id)) {
    errors.push(`"${ability_id}" is not a legal ability for ${name}`);
  }

  // Restricted Mode is off by default: any move can be saved on any Pokemon, matching
  // what the resolver/dropdown already showed as available. Callers opt back in to the
  // legal-pool check by passing { restrictedMode: true }.
  if (restrictedMode) {
    // allMoves is computed once at box->bench placement (see game-data/moveAvailabilityController.js)
    // and persisted on the entity -- fall back to the old static computation only for
    // entities that never went through that flow (legacy data).
    const legalPool = Array.isArray(allMoves) && allMoves.length > 0
      ? allMoves.map(move => move.name)
      : (() => {
          const movesPool = allAvaliableMoves(activeForm, level, tutorTable, tutorLevel, avaliableTMS, isEggMoves);
          return player === 1
            ? legalMovesFilter(name, movesPool, bannedMoves, leechSeedExceptions, toxicExceptions)
            : movesPool;
        })();
    const legalPoolSet = new Set(legalPool);

    move_ids.forEach(move => {
      if (move && move !== '' && move !== 'None' && !legalPoolSet.has(move)) {
        errors.push(`"${move}" is not in ${name}'s legal move pool`);
      }
    });
  }

  STAT_KEYS.forEach(key => {
    if (EVs[key] > 252) errors.push(`EVs.${key} (${EVs[key]}) exceeds the per-stat maximum of 252`);
    if (EVs[key] < 0) errors.push(`EVs.${key} cannot be negative`);
    if (IVs[key] > 31) errors.push(`IVs.${key} (${IVs[key]}) exceeds the maximum of 31`);
    if (IVs[key] < 0) errors.push(`IVs.${key} cannot be negative`);
  });

  return { valid: errors.length === 0, errors };
};

module.exports = validate;
