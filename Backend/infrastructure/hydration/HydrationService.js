const { getModels, avaliableTMS } = require('../../Config/jsonOptions');
const {
  isEggMoves,
  tutorLevel,
  tutorTable,
  bannedMoves,
  leechSeedExceptions,
  toxicExceptions,
  bannedAbilities,
  abilityExceptions,
} = require('../../Config/jsOptions');
const allAvaliableMoves = require('../../Domain/pokemonMovesets');
const legalMoves = require('../../Domain/legalMoves');
const legalAbility = require('../../Domain/legalAbilites');
const stats = require('../../Domain/statCalculator');

let movesMap = new Map();
let abilitiesMap = new Map();

const load = () => {
  const { movesList, abilities } = getModels();
  movesMap = new Map(Object.entries(movesList));
  abilitiesMap = new Map(Object.entries(abilities));
};

const getMove = (moveName) => movesMap.get(moveName) ?? null;
const getAbility = (abilityName) => abilitiesMap.get(abilityName) ?? null;

const buildFormEntry = (formData, abilityIndex, activeSpeciesAbilityCount, EVs, IVs, nature, level, player) => {
  const baseName = formData.name.replace('_MEGA', '');

  const formAbilities = player === 1
    ? formData.abilities.map(ab => legalAbility(baseName, ab, bannedAbilities, abilityExceptions))
    : [...formData.abilities];

  const movesPool = allAvaliableMoves(formData, level, tutorTable, tutorLevel, avaliableTMS, isEggMoves);
  const filteredMovesPool = player === 1
    ? legalMoves(baseName, movesPool, bannedMoves, leechSeedExceptions, toxicExceptions)
    : movesPool;

  const formBaseStats = {
    HP: formData.baseHP,
    Atk: formData.baseAttack,
    Def: formData.baseDefense,
    SpA: formData.baseSpAttack,
    SpD: formData.baseSpDefense,
    Spe: formData.baseSpeed,
  };

  const formFinalStats = {
    HP: stats.finalHP(formBaseStats.HP, EVs.HP, IVs.HP, level),
    ...stats.finalStats(formBaseStats, EVs, IVs, nature, level),
  };

  const resolvedAbility =
    formAbilities[abilityIndex] ??
    formAbilities[abilityIndex - 1] ??
    formAbilities[0];

  // If the active ability occupies the hidden-ability slot on the base form but this
  // alternate form has fewer slots, that slot doesn't exist here — fall back to slot 0.
  const isHiddenAbilitySlot = abilityIndex === formAbilities.length - 1;
  const ability = isHiddenAbilitySlot && abilityIndex !== activeSpeciesAbilityCount - 1
    ? formAbilities[0]
    : resolvedAbility;

  return {
    formName: formData.name,
    ID: formData.ID,
    sprite: formData.sprite,
    type1: formData.type1,
    type2: formData.type1 === formData.type2 ? 'None' : formData.type2,
    ability,
    abilities: formAbilities,
    baseStats: formBaseStats,
    finalStats: formFinalStats,
    allMoves: filteredMovesPool,
  };
};

const hydrate = (entity) => {
  const { species2, natures } = getModels();
  const { name, form, gender, level, nature: natureName, item, ability_id, move_ids, EVs, IVs, player, version } = entity;

  if (!species2[name]) throw new Error(`${name} is not a valid Pokémon species`);

  const nature = natures[natureName] ?? natures['Hardy'];
  const activeForm = species2[form] ?? species2[name];
  const baseSpecies = species2[name];

  const activeAbility = player === 1
    ? legalAbility(name, ability_id, bannedAbilities, abilityExceptions)
    : ability_id;

  const possibleAbilities = player === 1
    ? activeForm.abilities.map(ab => legalAbility(name, ab, bannedAbilities, abilityExceptions))
    : [...activeForm.abilities];

  const abilityIndex = activeForm.abilities.findIndex(ab => ab === ability_id);

  const movesPool = allAvaliableMoves(activeForm, level, tutorTable, tutorLevel, avaliableTMS, isEggMoves);
  const filteredMoves = player === 1
    ? legalMoves(name, movesPool, bannedMoves, leechSeedExceptions, toxicExceptions)
    : movesPool;

  const baseStats = {
    HP: activeForm.baseHP,
    Atk: activeForm.baseAttack,
    Def: activeForm.baseDefense,
    SpA: activeForm.baseSpAttack,
    SpD: activeForm.baseSpDefense,
    Spe: activeForm.baseSpeed,
  };

  const finalStats = {
    HP: stats.finalHP(baseStats.HP, EVs.HP, IVs.HP, level),
    ...stats.finalStats(baseStats, EVs, IVs, nature, level),
  };

  const forms = {};
  [baseSpecies.name, ...baseSpecies.forms].forEach(formName => {
    const formData = species2[formName];
    if (!formData) return;
    forms[formName] = buildFormEntry(
      formData,
      abilityIndex,
      activeForm.abilities.length,
      EVs, IVs, nature, level, player,
    );
  });

  return {
    name,
    form,
    ID: activeForm.ID,
    sprite: activeForm.sprite,
    femaleSprite: activeForm.femaleSprite,
    type1: activeForm.type1,
    type2: activeForm.type1 === activeForm.type2 ? 'None' : activeForm.type2,
    gender,
    level,
    nature: natureName,
    item,
    ability: activeAbility,
    abilities: [...new Set(possibleAbilities)],
    baseStats,
    EVs,
    IVs,
    finalStats,
    moveset: move_ids,
    allMoves: filteredMoves,
    forms,
    version,
  };
};

module.exports = { load, hydrate, getMove, getAbility };
