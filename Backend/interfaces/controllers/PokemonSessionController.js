const SessionService = require('../../Domain/session/SessionService');
const CalculationDomainService = require('../../Domain/pokemon/CalculationDomainService');
const TeamRepository = require('../../infrastructure/repositories/TeamRepository');

const activate = async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const { sessionId, player, teamName, pokemonName } = req.body;

    if (!sessionId || !player || !teamName || !pokemonName) {
      return res.status(400).json({ message: 'sessionId, player, teamName, and pokemonName are required' });
    }

    const hydrated = await SessionService.activate(userId, sessionId, {
      player: Number(player),
      teamName,
      pokemonName,
    });

    return res.status(200).json({ message: 'Draft activated', pokemon: hydrated });
  } catch (error) {
    return res.status(404).json({ message: error.message });
  }
};

const patchDraft = (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const { sessionId } = req.params;
    const hydrated = SessionService.patchDraft(userId, sessionId, req.body);
    return res.status(200).json({ message: 'Draft updated', pokemon: hydrated });
  } catch (error) {
    const status = error.message.includes('No active draft') ? 404 : 400;
    return res.status(status).json({ message: error.message });
  }
};

const saveDraft = async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const { sessionId } = req.params;
    const { teamName, pokemonName } = req.body;

    if (!teamName || !pokemonName) {
      return res.status(400).json({ message: 'teamName and pokemonName are required' });
    }

    const entity = SessionService.getDraftEntity(userId, sessionId);

    const { valid, errors } = CalculationDomainService.validate(entity);
    if (!valid) {
      return res.status(422).json({ message: 'Validation failed', errors });
    }

    await TeamRepository.savePokemon(entity, teamName, pokemonName, userId);
    SessionService.removeDraft(userId, sessionId);

    return res.status(200).json({ message: `${entity.name} saved successfully` });
  } catch (error) {
    if (error.message.includes('No active draft')) return res.status(404).json({ message: error.message });
    if (error.status === 403) return res.status(403).json({ message: error.message });
    if (error.status === 409) return res.status(409).json({ message: error.message });
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { activate, patchDraft, saveDraft };
