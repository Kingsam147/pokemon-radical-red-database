const redis = require('../infrastructure/redis/redisClient');
const TeamRepository = require('../teams/TeamRepository');
const { getModels } = require('../game-data/loadModels');

const ENEMY_PREVIEW_KEY = 'enemy:preview:hydrated';
const ENEMY_PREVIEW_TTL = 86400; // 24 hours — matches P2_TEAMS_TTL convention

const normalizeMoveKey = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

const resolveMoveList = (moveset, movesList) =>
  (moveset || []).map((move) =>
    typeof move === 'string'
      ? movesList[normalizeMoveKey(move)] || { name: move }
      : move,
  );

const resolveForm = (form, models) => ({
  ...form,
  ability:
    typeof form.ability === 'string'
      ? models.abilities[form.ability]
      : form.ability,
  abilities: (form.abilities || []).map((a) =>
    typeof a === 'string' ? models.abilities[a] : a,
  ),
  allMoves: resolveMoveList(form.allMoves, models.movesList),
  type1:
    typeof form.type1 === 'string' ? models.typeChart[form.type1] : form.type1,
  type2:
    typeof form.type2 === 'string' ? models.typeChart[form.type2] : form.type2,
});

const resolvePokemon = (pokemon, models) => {
  const resolvedForms = {};
  for (const [formName, form] of Object.entries(pokemon.forms || {})) {
    resolvedForms[formName] = resolveForm(form, models);
  }

  return {
    ...pokemon,
    item:
      typeof pokemon.item === 'string'
        ? models.items[pokemon.item]
        : pokemon.item,
    ability:
      typeof pokemon.ability === 'string'
        ? models.abilities[pokemon.ability]
        : pokemon.ability,
    abilities: (pokemon.abilities || []).map((a) =>
      typeof a === 'string' ? models.abilities[a] : a,
    ),
    nature:
      typeof pokemon.nature === 'string'
        ? models.natures[pokemon.nature]
        : pokemon.nature,
    type1:
      typeof pokemon.type1 === 'string'
        ? models.typeChart[pokemon.type1]
        : pokemon.type1,
    type2:
      typeof pokemon.type2 === 'string'
        ? models.typeChart[pokemon.type2]
        : pokemon.type2,
    moveset: resolveMoveList(pokemon.moveset, models.movesList),
    allMoves: resolveMoveList(pokemon.allMoves, models.movesList),
    statBoosts: pokemon.statBoosts || {
      Atk: 0,
      Def: 0,
      SpA: 0,
      SpD: 0,
      Spe: 0,
    },
    forms: resolvedForms,
  };
};

const resolveTeamSlots = (team, models) => {
  const resolved = {};
  for (const [slotKey, entry] of Object.entries(team)) {
    if (slotKey === 'trainerInfo' || !entry) {
      resolved[slotKey] = entry;
      continue;
    }
    resolved[slotKey] = resolvePokemon(entry, models);
  }
  return resolved;
};

const buildEnemyPreview = async () => {
  const allTeams = await TeamRepository.loadAllTeams(2, null);
  const teamNames = Object.keys(allTeams);
  if (teamNames.length === 0) return null;

  const teamName = teamNames[0];
  const rawTeam = allTeams[teamName];
  const plainTeam = Array.isArray(rawTeam) ? rawTeam : rawTeam.toJSON();
  const team = resolveTeamSlots(plainTeam, getModels());

  return { teamName, team };
};

const getHydratedEnemyPreview = async () => {
  const cached = await redis.get(ENEMY_PREVIEW_KEY);
  if (cached) return cached;

  const preview = await buildEnemyPreview();
  if (preview) await redis.set(ENEMY_PREVIEW_KEY, preview, ENEMY_PREVIEW_TTL);
  return preview;
};

const invalidateEnemyPreview = () => redis.del(ENEMY_PREVIEW_KEY);

module.exports = {
  getHydratedEnemyPreview,
  invalidateEnemyPreview,
  ENEMY_PREVIEW_KEY,
};
