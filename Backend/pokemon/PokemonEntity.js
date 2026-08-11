const STAT_KEYS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
const PATCHABLE_FIELDS = ['move_ids', 'ability_id', 'item', 'nature', 'EVs', 'IVs', 'level'];

const validateStatBlock = (block, label) => {
  if (!block || typeof block !== 'object') throw new Error(`${label} must be an object`);
  for (const key of STAT_KEYS) {
    if (typeof block[key] !== 'number') throw new Error(`${label}.${key} must be a number`);
  }
};

const validateTotalEVs = (EVs) => {
  let total = 0;
  for (const key of STAT_KEYS) {
    total += EVs[key];
  }
  if (total > 510) throw new Error(`Total EVs (${total}) cannot exceed 510`);
};

const resolveLegacyNatureName = (nature, natures) => {
  if (!nature) return 'Hardy';
  if (typeof nature === 'string') return nature;
  if (typeof nature.name === 'string') return nature.name;
  const entries = Object.entries(natures);
  const match = entries.find(
    (entry) => entry[1].increase === nature.increase && entry[1].decrease === nature.decrease,
  );
  return match ? match[0] : 'Hardy';
};

const resolveLegacyItemName = (item, items) => {
  if (!item || item === 'None') return '';
  if (typeof item === 'string') return item;
  if (typeof item.name === 'string') return item.name;
  const serialized = JSON.stringify(item);
  const entries = Object.entries(items);
  const match = entries.find((entry) => JSON.stringify(entry[1]) === serialized);
  return match ? match[0] : '';
};

class PokemonEntity {
  #name;
  #form;
  #gender;
  #level;
  #nature;
  #item;
  #abilityId;
  #moveIds;
  #EVs;
  #IVs;
  #player;
  #version;
  #userId;

  constructor(fields) {
    const name = fields.name;
    const form = fields.form;
    const gender = fields.gender;
    const level = fields.level;
    const nature = fields.nature;
    const item = fields.item === undefined ? '' : fields.item;
    const abilityId = fields.ability_id;
    const moveIds = fields.move_ids;
    const EVs = fields.EVs;
    const IVs = fields.IVs;
    const player = fields.player;
    const version = fields.version === undefined ? 0 : fields.version;
    const userId = fields.userId;

    if (!name || typeof name !== 'string') throw new Error('name is required');
    if (!form || typeof form !== 'string') throw new Error('form is required');
    if (!['M', 'F', 'N'].includes(gender)) throw new Error("gender must be 'M', 'F', or 'N'");
    if (!Number.isInteger(level) || level < 1 || level > 100)
      throw new Error('level must be an integer from 1 to 100');
    if (!nature || typeof nature !== 'string')
      throw new Error('nature must be a non-empty string name');
    if (typeof item !== 'string') throw new Error('item must be a string');
    if (!abilityId || typeof abilityId !== 'string')
      throw new Error('ability_id must be a non-empty string');
    if (!Array.isArray(moveIds) || moveIds.length > 4)
      throw new Error('move_ids must be an array of at most 4 strings');
    if (![1, 2].includes(player)) throw new Error('player must be 1 or 2');

    validateStatBlock(EVs, 'EVs');
    validateStatBlock(IVs, 'IVs');
    validateTotalEVs(EVs);

    this.#name = name;
    this.#form = form;
    this.#gender = gender;
    this.#level = level;
    this.#nature = nature;
    this.#item = item;
    this.#abilityId = abilityId;
    this.#moveIds = moveIds.slice(0, 4).map((moveId) => (typeof moveId === 'string' ? moveId : ''));
    this.#EVs = Object.assign({}, EVs);
    this.#IVs = Object.assign({}, IVs);
    this.#player = player;
    this.#version = version;
    this.#userId = userId;
  }

  get name() {
    return this.#name;
  }

  get form() {
    return this.#form;
  }

  get gender() {
    return this.#gender;
  }

  get level() {
    return this.#level;
  }

  get nature() {
    return this.#nature;
  }

  get item() {
    return this.#item;
  }

  get ability_id() {
    return this.#abilityId;
  }

  get move_ids() {
    return this.#moveIds.slice();
  }

  get EVs() {
    return Object.assign({}, this.#EVs);
  }

  get IVs() {
    return Object.assign({}, this.#IVs);
  }

  get player() {
    return this.#player;
  }

  get version() {
    return this.#version;
  }

  get userId() {
    return this.#userId;
  }

  changeMoves(moveIds) {
    if (!Array.isArray(moveIds) || moveIds.length > 4)
      throw new Error('move_ids must be an array of at most 4 strings');
    this.#moveIds = moveIds.slice(0, 4).map((moveId) => (typeof moveId === 'string' ? moveId : ''));
  }

  changeAbility(abilityId) {
    if (!abilityId || typeof abilityId !== 'string')
      throw new Error('ability_id must be a non-empty string');
    this.#abilityId = abilityId;
  }

  changeItem(item) {
    const resolvedItem = item === undefined || item === null ? '' : item;
    if (typeof resolvedItem !== 'string') throw new Error('item must be a string');
    this.#item = resolvedItem;
  }

  changeNature(nature) {
    if (!nature || typeof nature !== 'string')
      throw new Error('nature must be a non-empty string name');
    this.#nature = nature;
  }

  changeLevel(level) {
    if (!Number.isInteger(level) || level < 1 || level > 100)
      throw new Error('level must be an integer from 1 to 100');
    this.#level = level;
  }

  changeEVs(EVs) {
    validateStatBlock(EVs, 'EVs');
    validateTotalEVs(EVs);
    this.#EVs = Object.assign({}, EVs);
  }

  changeIVs(IVs) {
    validateStatBlock(IVs, 'IVs');
    this.#IVs = Object.assign({}, IVs);
  }

  applyPatch(changes) {
    if (!changes || typeof changes !== 'object') throw new Error('changes must be an object');

    const whitelistedKeys = PATCHABLE_FIELDS.filter((key) => key in changes);
    if (whitelistedKeys.length === 0) return;

    const candidateFields = Object.assign({}, this.toJSON());
    whitelistedKeys.forEach((key) => {
      candidateFields[key] = changes[key];
    });

    const candidate = PokemonEntity.create(candidateFields);

    whitelistedKeys.forEach((key) => {
      if (key === 'move_ids') this.#moveIds = candidate.move_ids;
      if (key === 'ability_id') this.#abilityId = candidate.ability_id;
      if (key === 'item') this.#item = candidate.item;
      if (key === 'nature') this.#nature = candidate.nature;
      if (key === 'EVs') this.#EVs = candidate.EVs;
      if (key === 'IVs') this.#IVs = candidate.IVs;
      if (key === 'level') this.#level = candidate.level;
    });
  }

  prepareForSave() {
    const snapshot = this.toJSON();
    snapshot.version = this.#version + 1;
    return new PokemonEntity(snapshot);
  }

  toJSON() {
    const json = {
      name: this.#name,
      form: this.#form,
      gender: this.#gender,
      level: this.#level,
      nature: this.#nature,
      item: this.#item,
      ability_id: this.#abilityId,
      move_ids: this.#moveIds.slice(),
      EVs: Object.assign({}, this.#EVs),
      IVs: Object.assign({}, this.#IVs),
      player: this.#player,
      version: this.#version,
    };
    if (this.#userId !== undefined) json.userId = this.#userId;
    return json;
  }

  static create(fields) {
    return new PokemonEntity(fields);
  }

  static fromStoredDoc(doc, models, player, userId) {
    const resolvedPlayer = player === undefined ? 1 : player;
    const isLeanShape = 'ability_id' in doc && 'move_ids' in doc;
    if (isLeanShape) {
      const fields = Object.assign({}, doc);
      fields.form = doc.form === undefined ? doc.name : doc.form;
      fields.player = doc.player === undefined ? resolvedPlayer : doc.player;
      fields.userId = doc.userId === undefined ? userId : doc.userId;
      return new PokemonEntity(fields);
    }
    return new PokemonEntity({
      name: doc.name,
      form: doc.form === undefined ? doc.name : doc.form,
      gender: doc.gender,
      level: doc.level,
      nature: resolveLegacyNatureName(doc.nature, models.natures),
      item: resolveLegacyItemName(doc.item, models.items),
      ability_id: doc.ability,
      move_ids: doc.moveset === undefined ? [] : doc.moveset,
      EVs: doc.EVs,
      IVs: doc.IVs,
      player: doc.player === undefined ? resolvedPlayer : doc.player,
      version: doc.version === undefined ? 0 : doc.version,
      userId: doc.userId === undefined ? userId : doc.userId,
    });
  }

  static get STAT_KEYS() {
    return STAT_KEYS.slice();
  }

  static get PATCHABLE_FIELDS() {
    return PATCHABLE_FIELDS.slice();
  }
}

module.exports = PokemonEntity;
