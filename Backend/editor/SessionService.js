const SessionStore = require('./SessionStore');
const TeamRepository = require('../teams/TeamRepository');
const PokemonEntity = require('../pokemon/PokemonEntity');
const HydrationService = require('../pokemon/HydrationService');

const activate = async (userId, sessionId, { player, teamName, pokemonName }) => {
  const team = await TeamRepository.findTeam(player, teamName, userId);
  const stored = !Array.isArray(team) ? team.getPokemon(pokemonName) : null;
  if (!stored) throw new Error(`${pokemonName} not found in team "${teamName}"`);

  SessionStore.set(userId, sessionId, stored);
  return HydrationService.hydrate(stored);
};

const getSession = async (userId, sessionId, lookupParams = null) => {
  if (SessionStore.has(userId, sessionId)) {
    return { source: 'draft', hydrated: HydrationService.hydrate(SessionStore.get(userId, sessionId)) };
  }

  if (!lookupParams) return null;

  const { player, teamName, pokemonName } = lookupParams;
  const team = await TeamRepository.findTeam(player, teamName, userId);
  const stored = !Array.isArray(team) ? team.getPokemon(pokemonName) : null;
  if (!stored) throw new Error(`${pokemonName} not found in team "${teamName}"`);

  return { source: 'golden', hydrated: HydrationService.hydrate(stored) };
};

const patchDraft = (userId, sessionId, changes) => {
  if (!SessionStore.has(userId, sessionId)) {
    throw new Error(`No active draft for session "${sessionId}" (user: "${userId}"). Call activate first.`);
  }

  const current = SessionStore.get(userId, sessionId);
  current.applyPatch(changes);
  SessionStore.set(userId, sessionId, current);
  return HydrationService.hydrate(current);
};

const getDraftEntity = (userId, sessionId) => {
  if (!SessionStore.has(userId, sessionId))
    throw new Error(`No active draft for session "${sessionId}" (user: "${userId}")`);
  return SessionStore.get(userId, sessionId);
};

const removeDraft = (userId, sessionId) => SessionStore.remove(userId, sessionId);

module.exports = { activate, getSession, patchDraft, getDraftEntity, removeDraft };
