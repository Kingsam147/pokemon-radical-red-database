const STAT_KEYS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];

const validateStatBlock = (block, label) => {
  if (!block || typeof block !== 'object') throw new Error(`${label} must be an object`);
  for (const key of STAT_KEYS) {
    if (typeof block[key] !== 'number') {
      throw new Error(`${label}.${key} must be a number`);
    }
  }
};

const create = ({
  name,
  form,
  gender,
  level,
  nature,
  item = '',
  ability_id,
  move_ids,
  EVs,
  IVs,
  player,
  version = 0,
  userId,
}) => {
  if (!name || typeof name !== 'string') throw new Error('name is required');
  if (!form || typeof form !== 'string') throw new Error('form is required');
  if (!['M', 'F', 'N'].includes(gender)) throw new Error("gender must be 'M', 'F', or 'N'");
  if (!Number.isInteger(level) || level < 1 || level > 100) throw new Error('level must be an integer from 1 to 100');
  if (!nature || typeof nature !== 'string') throw new Error('nature must be a non-empty string name');
  if (!ability_id || typeof ability_id !== 'string') throw new Error('ability_id must be a non-empty string');
  if (!Array.isArray(move_ids) || move_ids.length > 4) throw new Error('move_ids must be an array of at most 4 strings');
  if (![1, 2].includes(player)) throw new Error('player must be 1 or 2');

  validateStatBlock(EVs, 'EVs');
  validateStatBlock(IVs, 'IVs');

  const totalEVs = STAT_KEYS.reduce((sum, key) => sum + EVs[key], 0);
  if (totalEVs > 510) throw new Error(`Total EVs (${totalEVs}) cannot exceed 510`);

  const entity = {
    name,
    form,
    gender,
    level,
    nature,
    item,
    ability_id,
    move_ids: move_ids.slice(0, 4).map(m => (typeof m === 'string' ? m : '')),
    EVs: { ...EVs },
    IVs: { ...IVs },
    player,
    version,
  };

  if (userId !== undefined) entity.userId = userId;

  return entity;
};

const fromHydrated = (hydrated, player = 1, userId) => {
  const natureName =
    hydrated.nature && typeof hydrated.nature === 'object'
      ? (hydrated.nature.name ?? 'Hardy')
      : (hydrated.nature ?? 'Hardy');

  const itemName =
    hydrated.item && typeof hydrated.item === 'object'
      ? (hydrated.item.name ?? '')
      : (hydrated.item ?? '');

  return create({
    name: hydrated.name,
    form: hydrated.form,
    gender: hydrated.gender,
    level: hydrated.level,
    nature: natureName,
    item: itemName,
    ability_id: hydrated.ability,
    move_ids: hydrated.moveset ?? [],
    EVs: hydrated.EVs,
    IVs: hydrated.IVs,
    player: hydrated.player ?? player,
    version: hydrated.version ?? 0,
    userId: hydrated.userId ?? userId,
  });
};

module.exports = { create, fromHydrated, STAT_KEYS };
