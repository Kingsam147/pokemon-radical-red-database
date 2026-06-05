const SessionStore = require('../../infrastructure/session/SessionStore');
const { getModels, findTeam } = require('../../Config/jsonOptions');
const PokemonEntity = require('../pokemon/PokemonEntity');
const HydrationService = require('../../infrastructure/hydration/HydrationService');

const PATCHABLE_FIELDS = ['move_ids', 'ability_id', 'item', 'nature', 'EVs', 'IVs', 'level'];

const resolveLegacyNatureName = (nature, natures) => {
  if (!nature) return 'Hardy';
  if (typeof nature === 'string') return nature;
  if (typeof nature.name === 'string') return nature.name;

  // Neutral natures (increase === decrease) are ambiguous here — any resolved name
  // is functionally correct since the stat multiplier is 1.0x for all of them.
  const match = Object.entries(natures).find(([, value]) =>
    value.increase === nature.increase && value.decrease === nature.decrease
  );
  return match?.[0] ?? 'Hardy';
};

const resolveLegacyItemName = (item, items) => {
  if (!item || item === 'None') return '';
  if (typeof item === 'string') return item;
  if (typeof item.name === 'string') return item.name;

  // Structural comparison as a last resort for legacy embedded item objects.
  const serialized = JSON.stringify(item);
  const match = Object.entries(items).find(([, value]) => JSON.stringify(value) === serialized);
  return match?.[0] ?? '';
};

const activate = async (userId, sessionId, { player, teamName, pokemonName }) => {
  const team = await findTeam(player, teamName, userId);

  if (!team[pokemonName]) {
    throw new Error(`${pokemonName} not found in team "${teamName}"`);
  }

  const golden = team[pokemonName];
  const { natures, items } = getModels();

  const entity = PokemonEntity.fromHydrated(
    {
      ...golden,
      nature: resolveLegacyNatureName(golden.nature, natures),
      item: resolveLegacyItemName(golden.item, items),
    },
    player,
    userId,
  );

  SessionStore.set(userId, sessionId, entity);
  return HydrationService.hydrate(entity);
};

const getSession = async (userId, sessionId, lookupParams = null) => {
  if (SessionStore.has(userId, sessionId)) {
    return {
      source: 'draft',
      hydrated: HydrationService.hydrate(SessionStore.get(userId, sessionId)),
    };
  }

  if (!lookupParams) return null;

  const { player, teamName, pokemonName } = lookupParams;
  const team = await findTeam(player, teamName, userId);

  if (!team[pokemonName]) {
    throw new Error(`${pokemonName} not found in team "${teamName}"`);
  }

  const golden = team[pokemonName];
  const { natures, items } = getModels();

  const entity = PokemonEntity.fromHydrated(
    {
      ...golden,
      nature: resolveLegacyNatureName(golden.nature, natures),
      item: resolveLegacyItemName(golden.item, items),
    },
    player,
    userId,
  );

  return {
    source: 'golden',
    hydrated: HydrationService.hydrate(entity),
  };
};

const patchDraft = (userId, sessionId, changes) => {
  if (!SessionStore.has(userId, sessionId)) {
    throw new Error(`No active draft for session "${sessionId}" (user: "${userId}"). Call activate first.`);
  }

  const current = SessionStore.get(userId, sessionId);

  const allowedChanges = PATCHABLE_FIELDS.reduce((accumulator, key) => {
    if (key in changes) accumulator[key] = changes[key];
    return accumulator;
  }, {});

  const updated = PokemonEntity.create({ ...current, ...allowedChanges });
  SessionStore.set(userId, sessionId, updated);
  return HydrationService.hydrate(updated);
};

const getDraftEntity = (userId, sessionId) => {
  if (!SessionStore.has(userId, sessionId)) {
    throw new Error(`No active draft for session "${sessionId}" (user: "${userId}")`);
  }
  return SessionStore.get(userId, sessionId);
};

const removeDraft = (userId, sessionId) => SessionStore.remove(userId, sessionId);

module.exports = { activate, getSession, patchDraft, getDraftEntity, removeDraft };
