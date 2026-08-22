# Backend Domain/Feature Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two-pipeline Pokemon-storage drift, consolidate all DB access behind one repository per aggregate, introduce private-field domain classes, and reorganize `Backend/` into the feature folders from the audit — while keeping every HTTP endpoint's request/response contract identical for the frontend.

**Architecture:** `PokemonEntity`/`BoxEntity`/`TeamEntity` become classes with private (`#`) fields, mutable only through named methods. `BoxRepository`/`TeamRepository` become the only files touching MongoDB for their aggregate. Storage is always the lean entity shape; `HydrationService.hydrate()` is called at the HTTP-response boundary, never stored. Existing data in the old fully-hydrated-blob shape is normalized transparently on read (`PokemonEntity.fromStoredDoc`), so no data migration script is needed.

**Tech Stack:** Node.js (CommonJS), Express, MongoDB native driver, ioredis, Jest.

**Source specs:** [2026-08-10-backend-feature-domain-audit.md](../specs/2026-08-10-backend-feature-domain-audit.md), [2026-08-10-backend-domain-cleanup-design.md](../specs/2026-08-10-backend-domain-cleanup-design.md)

---

## Assumptions (flagged during planning, not previously discussed)

1. **`updateInBox` is currently broken in production.** `Controllers/myBoxControllers.js` imports `findMyBox` from `Config/jsonOptions.js`, but `jsonOptions.js` never exports a function by that name — calling `PATCH /myBoxes/:index/:pokemonName` today throws `TypeError: findMyBox is not a function`, caught and returned as a 500. This plan fixes it as part of rewriting the box controller (Task 8), using `BoxRepository.loadOne`.
2. **Gender inference edge case.** The old `pokemonService.createPokemon` left `gender` as the literal string `'Both'` for any species not in its fixed name lists and without an explicit `(M)`/`(F)` in the import text — never validated, since the old pipeline didn't go through `PokemonEntity`. Since storage now always goes through `PokemonEntity` (which requires `'M' | 'F' | 'N'`), this plan maps that fallback case to `'N'`. Flagging in case any real species in the dataset actually hits this path.
3. **`teamControllers.saveFullTeam` stores a raw array (`bench`), not the name-keyed dict shape every other team endpoint expects.** This is a pre-existing shape inconsistency, not something this plan introduces or fixes — `TeamRepository` preserves it exactly (a team can be either a `TeamEntity` or a raw array depending on write history), out of scope to reconcile here.

---

## Target file structure

```
Backend/
  pokemon/
    PokemonEntity.js
    HydrationService.js
    createFromImportText.js
  boxes/
    BoxEntity.js
    BoxRepository.js
    boxControllers.js
  teams/
    TeamEntity.js
    TeamRepository.js
    teamControllers.js
    pokemonInTeamControllers.js
  editor/
    SessionService.js
    SessionStore.js
    PokemonSessionController.js
  forms/
    checkMega.js
  battling/
    changeActiveForm.js
    activePokemonControllers.js
    damageController.js
    CalculationService.js
  legality/
    legalAbilities.js
    legalMoves.js
    pokemonMovesets.js
    validate.js
  stats/
    statCalculator.js
    typeInteractions.js
  import/
    parsePokemonText.js
    textConversion.js
  enemy-preview/
    enemyPreviewService.js
    publicControllers.js
  identity/
    jwtCheck.js
    resolveIdentity.js
    AuthController.js
    GuestController.js
  game-data/
    loadModels.js
    miscControllers.js
  Config/
    mongodbOptions.js
    tsOptions.js
    jsOptions.js
  infrastructure/
    logger/
    rateLimit/
    redis/
  Models/                 # unchanged
  Routes/, interfaces/routes/  # updated require paths only
  server.js                # updated require paths only
```

Deleted at the end (Task 15): `Controllers/`, `Services/`, `Domain/pokemon/` (old location), `Domain/session/`, `infrastructure/hydration/`, `infrastructure/calculation/`, `infrastructure/repositories/`, `infrastructure/session/`, `interfaces/controllers/`, `Config/jsonOptions.js`.

---

### Task 1: `PokemonEntity` class

**Files:**
- Create: `Backend/pokemon/PokemonEntity.js`
- Test: `Backend/__tests__/unit/pokemon/PokemonEntity.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
const PokemonEntity = require('../../../pokemon/PokemonEntity');

const validFields = () => ({
  name: 'Blaziken',
  form: 'Blaziken',
  gender: 'M',
  level: 47,
  nature: 'Jolly',
  item: '',
  ability_id: 'Speed Boost',
  move_ids: ['High Jump Kick', 'Blaze Kick', 'Brave Bird', 'Detect'],
  EVs: { HP: 0, Atk: 252, Def: 0, SpA: 0, SpD: 0, Spe: 252 },
  IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
  player: 1,
});

describe('PokemonEntity construction', () => {
  test('constructs with valid fields and exposes getters', () => {
    const entity = PokemonEntity.create(validFields());
    expect(entity.name).toBe('Blaziken');
    expect(entity.ability_id).toBe('Speed Boost');
    expect(entity.move_ids).toEqual(['High Jump Kick', 'Blaze Kick', 'Brave Bird', 'Detect']);
    expect(entity.version).toBe(0);
  });

  test('EVs/IVs getters return defensive copies', () => {
    const entity = PokemonEntity.create(validFields());
    const evs = entity.EVs;
    evs.Atk = 999;
    expect(entity.EVs.Atk).toBe(252);
  });

  test('rejects missing name', () => {
    expect(() => PokemonEntity.create({ ...validFields(), name: '' })).toThrow('name is required');
  });

  test('rejects invalid gender', () => {
    expect(() => PokemonEntity.create({ ...validFields(), gender: 'X' })).toThrow(
      "gender must be 'M', 'F', or 'N'",
    );
  });

  test('rejects level out of range', () => {
    expect(() => PokemonEntity.create({ ...validFields(), level: 101 })).toThrow(
      'level must be an integer from 1 to 100',
    );
  });

  test('rejects more than 4 moves', () => {
    expect(() =>
      PokemonEntity.create({ ...validFields(), move_ids: ['A', 'B', 'C', 'D', 'E'] }),
    ).toThrow('move_ids must be an array of at most 4 strings');
  });

  test('rejects total EVs over 510', () => {
    expect(() =>
      PokemonEntity.create({
        ...validFields(),
        EVs: { HP: 252, Atk: 252, Def: 252, SpA: 0, SpD: 0, Spe: 0 },
      }),
    ).toThrow('Total EVs (756) cannot exceed 510');
  });

  test('rejects invalid player', () => {
    expect(() => PokemonEntity.create({ ...validFields(), player: 3 })).toThrow(
      'player must be 1 or 2',
    );
  });
});

describe('PokemonEntity mutation methods', () => {
  test('changeMoves replaces move_ids after validation', () => {
    const entity = PokemonEntity.create(validFields());
    entity.changeMoves(['Overheat']);
    expect(entity.move_ids).toEqual(['Overheat']);
  });

  test('changeMoves rejects more than 4 moves', () => {
    const entity = PokemonEntity.create(validFields());
    expect(() => entity.changeMoves(['A', 'B', 'C', 'D', 'E'])).toThrow(
      'move_ids must be an array of at most 4 strings',
    );
  });

  test('changeAbility rejects empty ability', () => {
    const entity = PokemonEntity.create(validFields());
    expect(() => entity.changeAbility('')).toThrow('ability_id must be a non-empty string');
  });

  test('changeEVs re-validates the 510 total cap', () => {
    const entity = PokemonEntity.create(validFields());
    expect(() =>
      entity.changeEVs({ HP: 252, Atk: 252, Def: 252, SpA: 0, SpD: 0, Spe: 0 }),
    ).toThrow('Total EVs (756) cannot exceed 510');
  });

  test('applyPatch only touches whitelisted fields and ignores the rest', () => {
    const entity = PokemonEntity.create(validFields());
    entity.applyPatch({ level: 50, name: 'Torkoal' });
    expect(entity.level).toBe(50);
    expect(entity.name).toBe('Blaziken');
  });

  test('prepareForSave returns a new incremented-version entity, leaving the original untouched', () => {
    const entity = PokemonEntity.create(validFields());
    const saved = entity.prepareForSave();
    expect(saved.version).toBe(1);
    expect(entity.version).toBe(0);
    expect(saved).not.toBe(entity);
  });
});

describe('PokemonEntity.toJSON', () => {
  test('produces the lean stored shape', () => {
    const entity = PokemonEntity.create(validFields());
    expect(entity.toJSON()).toEqual({
      name: 'Blaziken',
      form: 'Blaziken',
      gender: 'M',
      level: 47,
      nature: 'Jolly',
      item: '',
      ability_id: 'Speed Boost',
      move_ids: ['High Jump Kick', 'Blaze Kick', 'Brave Bird', 'Detect'],
      EVs: validFields().EVs,
      IVs: validFields().IVs,
      player: 1,
      version: 0,
    });
  });
});

describe('PokemonEntity.fromStoredDoc', () => {
  const models = { natures: { Jolly: { increase: 'Spe', decrease: 'SpA' } }, items: {} };

  test('reads the lean shape (has ability_id/move_ids) directly', () => {
    const doc = { ...validFields() };
    const entity = PokemonEntity.fromStoredDoc(doc, models, 1, 'user-1');
    expect(entity.name).toBe('Blaziken');
    expect(entity.ability_id).toBe('Speed Boost');
  });

  test('normalizes the legacy full-hydrated-blob shape (has ability/moveset)', () => {
    const legacyDoc = {
      name: 'Blaziken',
      form: 'Blaziken',
      gender: 'M',
      level: 47,
      nature: 'Jolly',
      item: 'None',
      ability: 'Speed Boost',
      moveset: ['High Jump Kick', 'Blaze Kick', 'Brave Bird', 'Detect'],
      EVs: validFields().EVs,
      IVs: validFields().IVs,
      player: 1,
      baseStats: { HP: 80, Atk: 120, Def: 70, SpA: 110, SpD: 70, Spe: 80 },
    };
    const entity = PokemonEntity.fromStoredDoc(legacyDoc, models, 1, 'user-1');
    expect(entity.ability_id).toBe('Speed Boost');
    expect(entity.move_ids).toEqual(['High Jump Kick', 'Blaze Kick', 'Brave Bird', 'Detect']);
    expect(entity.item).toBe('');
    expect(entity.version).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Backend && npx jest __tests__/unit/pokemon/PokemonEntity.test.js`
Expected: FAIL — `Cannot find module '../../../pokemon/PokemonEntity'`

- [ ] **Step 3: Implement `PokemonEntity`**

```javascript
const STAT_KEYS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
const PATCHABLE_FIELDS = ['move_ids', 'ability_id', 'item', 'nature', 'EVs', 'IVs', 'level'];

const validateStatBlock = (block, label) => {
  if (!block || typeof block !== 'object') throw new Error(`${label} must be an object`);
  for (const key of STAT_KEYS) {
    if (typeof block[key] !== 'number') throw new Error(`${label}.${key} must be a number`);
  }
};

const validateTotalEVs = (EVs) => {
  const total = STAT_KEYS.reduce((sum, key) => sum + EVs[key], 0);
  if (total > 510) throw new Error(`Total EVs (${total}) cannot exceed 510`);
};

const resolveLegacyNatureName = (nature, natures) => {
  if (!nature) return 'Hardy';
  if (typeof nature === 'string') return nature;
  if (typeof nature.name === 'string') return nature.name;
  const match = Object.entries(natures).find(
    ([, value]) => value.increase === nature.increase && value.decrease === nature.decrease,
  );
  return match?.[0] ?? 'Hardy';
};

const resolveLegacyItemName = (item, items) => {
  if (!item || item === 'None') return '';
  if (typeof item === 'string') return item;
  if (typeof item.name === 'string') return item.name;
  const serialized = JSON.stringify(item);
  const match = Object.entries(items).find(([, value]) => JSON.stringify(value) === serialized);
  return match?.[0] ?? '';
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

  constructor({
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
  }) {
    if (!name || typeof name !== 'string') throw new Error('name is required');
    if (!form || typeof form !== 'string') throw new Error('form is required');
    if (!['M', 'F', 'N'].includes(gender)) throw new Error("gender must be 'M', 'F', or 'N'");
    if (!Number.isInteger(level) || level < 1 || level > 100)
      throw new Error('level must be an integer from 1 to 100');
    if (!nature || typeof nature !== 'string')
      throw new Error('nature must be a non-empty string name');
    if (!ability_id || typeof ability_id !== 'string')
      throw new Error('ability_id must be a non-empty string');
    if (!Array.isArray(move_ids) || move_ids.length > 4)
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
    this.#abilityId = ability_id;
    this.#moveIds = move_ids.slice(0, 4).map((m) => (typeof m === 'string' ? m : ''));
    this.#EVs = { ...EVs };
    this.#IVs = { ...IVs };
    this.#player = player;
    this.#version = version;
    this.#userId = userId;
  }

  get name() { return this.#name; }
  get form() { return this.#form; }
  get gender() { return this.#gender; }
  get level() { return this.#level; }
  get nature() { return this.#nature; }
  get item() { return this.#item; }
  get ability_id() { return this.#abilityId; }
  get move_ids() { return [...this.#moveIds]; }
  get EVs() { return { ...this.#EVs }; }
  get IVs() { return { ...this.#IVs }; }
  get player() { return this.#player; }
  get version() { return this.#version; }
  get userId() { return this.#userId; }

  changeMoves(moveIds) {
    if (!Array.isArray(moveIds) || moveIds.length > 4)
      throw new Error('move_ids must be an array of at most 4 strings');
    this.#moveIds = moveIds.slice(0, 4).map((m) => (typeof m === 'string' ? m : ''));
  }

  changeAbility(abilityId) {
    if (!abilityId || typeof abilityId !== 'string')
      throw new Error('ability_id must be a non-empty string');
    this.#abilityId = abilityId;
  }

  changeItem(item) {
    this.#item = item ?? '';
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
    this.#EVs = { ...EVs };
  }

  changeIVs(IVs) {
    validateStatBlock(IVs, 'IVs');
    this.#IVs = { ...IVs };
  }

  applyPatch(changes) {
    PATCHABLE_FIELDS.filter((key) => key in changes).forEach((key) => {
      if (key === 'move_ids') this.changeMoves(changes.move_ids);
      if (key === 'ability_id') this.changeAbility(changes.ability_id);
      if (key === 'item') this.changeItem(changes.item);
      if (key === 'nature') this.changeNature(changes.nature);
      if (key === 'EVs') this.changeEVs(changes.EVs);
      if (key === 'IVs') this.changeIVs(changes.IVs);
      if (key === 'level') this.changeLevel(changes.level);
    });
  }

  prepareForSave() {
    return new PokemonEntity({ ...this.toJSON(), version: this.#version + 1 });
  }

  toJSON() {
    return {
      name: this.#name,
      form: this.#form,
      gender: this.#gender,
      level: this.#level,
      nature: this.#nature,
      item: this.#item,
      ability_id: this.#abilityId,
      move_ids: [...this.#moveIds],
      EVs: { ...this.#EVs },
      IVs: { ...this.#IVs },
      player: this.#player,
      version: this.#version,
      ...(this.#userId !== undefined ? { userId: this.#userId } : {}),
    };
  }

  static create(fields) {
    return new PokemonEntity(fields);
  }

  static fromStoredDoc(doc, models, player = 1, userId) {
    const isLeanShape = 'ability_id' in doc && 'move_ids' in doc;
    if (isLeanShape) {
      return new PokemonEntity({ ...doc, player: doc.player ?? player, userId: doc.userId ?? userId });
    }
    return new PokemonEntity({
      name: doc.name,
      form: doc.form ?? doc.name,
      gender: doc.gender,
      level: doc.level,
      nature: resolveLegacyNatureName(doc.nature, models.natures),
      item: resolveLegacyItemName(doc.item, models.items),
      ability_id: doc.ability,
      move_ids: doc.moveset ?? [],
      EVs: doc.EVs,
      IVs: doc.IVs,
      player: doc.player ?? player,
      version: doc.version ?? 0,
      userId: doc.userId ?? userId,
    });
  }

  static get STAT_KEYS() { return [...STAT_KEYS]; }
  static get PATCHABLE_FIELDS() { return [...PATCHABLE_FIELDS]; }
}

module.exports = PokemonEntity;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Backend && npx jest __tests__/unit/pokemon/PokemonEntity.test.js`
Expected: PASS (all tests green)

- [ ] **Step 5: Commit**

```bash
git add Backend/pokemon/PokemonEntity.js Backend/__tests__/unit/pokemon/PokemonEntity.test.js
git commit -m "feat: introduce PokemonEntity as a private-field class"
```

---

### Task 2: `BoxEntity` class

**Files:**
- Create: `Backend/boxes/BoxEntity.js`
- Test: `Backend/__tests__/unit/boxes/BoxEntity.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
const BoxEntity = require('../../../boxes/BoxEntity');
const PokemonEntity = require('../../../pokemon/PokemonEntity');

const makePokemon = (name) =>
  PokemonEntity.create({
    name,
    form: name,
    gender: 'N',
    level: 50,
    nature: 'Hardy',
    item: '',
    ability_id: 'Levitate',
    move_ids: [],
    EVs: { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
    IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
    player: 1,
  });

describe('BoxEntity', () => {
  test('starts empty and reports size 0', () => {
    const box = new BoxEntity();
    expect(box.size).toBe(0);
    expect(box.hasPokemon('Ditto')).toBe(false);
  });

  test('addPokemon adds and getPokemon retrieves it', () => {
    const box = new BoxEntity();
    const ditto = makePokemon('Ditto');
    box.addPokemon(ditto);
    expect(box.hasPokemon('Ditto')).toBe(true);
    expect(box.getPokemon('Ditto')).toBe(ditto);
    expect(box.size).toBe(1);
  });

  test('addPokemon throws on duplicate name', () => {
    const box = new BoxEntity();
    box.addPokemon(makePokemon('Ditto'));
    expect(() => box.addPokemon(makePokemon('Ditto'))).toThrow(
      'Ditto already exists in this box',
    );
  });

  test('removePokemon deletes and returns the removed entity, or null if absent', () => {
    const box = new BoxEntity();
    const ditto = makePokemon('Ditto');
    box.addPokemon(ditto);
    expect(box.removePokemon('Ditto')).toBe(ditto);
    expect(box.hasPokemon('Ditto')).toBe(false);
    expect(box.removePokemon('Ditto')).toBeNull();
  });

  test('updatePokemon replaces an existing entry, throws if missing', () => {
    const box = new BoxEntity();
    box.addPokemon(makePokemon('Ditto'));
    const replacement = makePokemon('Ditto');
    box.updatePokemon('Ditto', replacement);
    expect(box.getPokemon('Ditto')).toBe(replacement);
    expect(() => box.updatePokemon('Mew', makePokemon('Mew'))).toThrow(
      "Mew doesn't exist in this box",
    );
  });

  test('clear empties the box', () => {
    const box = new BoxEntity([makePokemon('Ditto'), makePokemon('Mew')]);
    box.clear();
    expect(box.size).toBe(0);
  });

  test('listPokemon returns all entities', () => {
    const box = new BoxEntity([makePokemon('Ditto'), makePokemon('Mew')]);
    expect(box.listPokemon().map((p) => p.name)).toEqual(['Ditto', 'Mew']);
  });

  test('toJSON produces a name-keyed dict of lean shapes', () => {
    const box = new BoxEntity([makePokemon('Ditto')]);
    expect(box.toJSON()).toEqual({ Ditto: makePokemon('Ditto').toJSON() });
  });

  test('fromStoredDoc reconstructs a box from a stored name-keyed doc', () => {
    const models = { natures: {}, items: {} };
    const doc = { Ditto: makePokemon('Ditto').toJSON() };
    const box = BoxEntity.fromStoredDoc(doc, models);
    expect(box.hasPokemon('Ditto')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Backend && npx jest __tests__/unit/boxes/BoxEntity.test.js`
Expected: FAIL — `Cannot find module '../../../boxes/BoxEntity'`

- [ ] **Step 3: Implement `BoxEntity`**

```javascript
const PokemonEntity = require('../pokemon/PokemonEntity');

class BoxEntity {
  #pokemon;

  constructor(pokemonEntities = []) {
    this.#pokemon = new Map();
    pokemonEntities.forEach((entity) => this.#pokemon.set(entity.name, entity));
  }

  hasPokemon(name) { return this.#pokemon.has(name); }
  getPokemon(name) { return this.#pokemon.get(name) ?? null; }
  listPokemon() { return [...this.#pokemon.values()]; }
  get size() { return this.#pokemon.size; }

  addPokemon(entity) {
    if (this.#pokemon.has(entity.name)) {
      const error = new Error(`${entity.name} already exists in this box`);
      error.code = 'DUPLICATE_POKEMON';
      throw error;
    }
    this.#pokemon.set(entity.name, entity);
  }

  removePokemon(name) {
    const entity = this.#pokemon.get(name);
    if (!entity) return null;
    this.#pokemon.delete(name);
    return entity;
  }

  updatePokemon(name, entity) {
    if (!this.#pokemon.has(name)) {
      const error = new Error(`${name} doesn't exist in this box`);
      error.code = 'NOT_FOUND';
      throw error;
    }
    this.#pokemon.delete(name);
    this.#pokemon.set(entity.name, entity);
  }

  clear() { this.#pokemon.clear(); }

  toJSON() {
    const result = {};
    for (const [name, entity] of this.#pokemon) result[name] = entity.toJSON();
    return result;
  }

  static fromStoredDoc(doc, models) {
    const entities = Object.entries(doc || {}).map(([, pokemonDoc]) =>
      PokemonEntity.fromStoredDoc(pokemonDoc, models),
    );
    return new BoxEntity(entities);
  }
}

module.exports = BoxEntity;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Backend && npx jest __tests__/unit/boxes/BoxEntity.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/boxes/BoxEntity.js Backend/__tests__/unit/boxes/BoxEntity.test.js
git commit -m "feat: introduce BoxEntity to encapsulate box contents"
```

---

### Task 3: `TeamEntity` class

**Files:**
- Create: `Backend/teams/TeamEntity.js`
- Test: `Backend/__tests__/unit/teams/TeamEntity.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
const TeamEntity = require('../../../teams/TeamEntity');
const PokemonEntity = require('../../../pokemon/PokemonEntity');

const makePokemon = (name) =>
  PokemonEntity.create({
    name,
    form: name,
    gender: 'N',
    level: 50,
    nature: 'Hardy',
    item: '',
    ability_id: 'Levitate',
    move_ids: [],
    EVs: { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
    IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
    player: 1,
  });

describe('TeamEntity', () => {
  test('starts empty with undefined trainerInfo by default', () => {
    const team = new TeamEntity();
    expect(team.size).toBe(0);
    expect(team.trainerInfo).toBeUndefined();
  });

  test('constructor accepts trainerInfo', () => {
    const team = new TeamEntity([], { name: 'Blue' });
    expect(team.trainerInfo).toEqual({ name: 'Blue' });
  });

  test('addPokemon/getPokemon/hasPokemon round-trip', () => {
    const team = new TeamEntity();
    const ditto = makePokemon('Ditto');
    team.addPokemon(ditto);
    expect(team.hasPokemon('Ditto')).toBe(true);
    expect(team.getPokemon('Ditto')).toBe(ditto);
  });

  test('addPokemon throws on duplicate', () => {
    const team = new TeamEntity();
    team.addPokemon(makePokemon('Ditto'));
    expect(() => team.addPokemon(makePokemon('Ditto'))).toThrow(
      'Ditto already exists in this team',
    );
  });

  test('removePokemon deletes and returns, or null if absent', () => {
    const team = new TeamEntity();
    const ditto = makePokemon('Ditto');
    team.addPokemon(ditto);
    expect(team.removePokemon('Ditto')).toBe(ditto);
    expect(team.removePokemon('Ditto')).toBeNull();
  });

  test('updatePokemon replaces an existing entry, throws if missing', () => {
    const team = new TeamEntity();
    team.addPokemon(makePokemon('Ditto'));
    const replacement = makePokemon('Ditto');
    team.updatePokemon('Ditto', replacement);
    expect(team.getPokemon('Ditto')).toBe(replacement);
    expect(() => team.updatePokemon('Mew', makePokemon('Mew'))).toThrow(
      "Mew doesn't exist in this team",
    );
  });

  test('toJSON includes trainerInfo only when set', () => {
    const withInfo = new TeamEntity([makePokemon('Ditto')], { name: 'Blue' });
    expect(withInfo.toJSON()).toEqual({
      Ditto: makePokemon('Ditto').toJSON(),
      trainerInfo: { name: 'Blue' },
    });

    const withoutInfo = new TeamEntity([makePokemon('Ditto')]);
    expect(withoutInfo.toJSON()).toEqual({ Ditto: makePokemon('Ditto').toJSON() });
  });

  test('fromStoredDoc separates trainerInfo from the pokemon entries', () => {
    const models = { natures: {}, items: {} };
    const doc = { Ditto: makePokemon('Ditto').toJSON(), trainerInfo: { name: 'Blue' } };
    const team = TeamEntity.fromStoredDoc(doc, models);
    expect(team.hasPokemon('Ditto')).toBe(true);
    expect(team.trainerInfo).toEqual({ name: 'Blue' });
  });

  test('fromStoredDoc handles a null/undefined doc as an empty team', () => {
    const team = TeamEntity.fromStoredDoc(undefined, { natures: {}, items: {} });
    expect(team.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Backend && npx jest __tests__/unit/teams/TeamEntity.test.js`
Expected: FAIL — `Cannot find module '../../../teams/TeamEntity'`

- [ ] **Step 3: Implement `TeamEntity`**

```javascript
const PokemonEntity = require('../pokemon/PokemonEntity');

class TeamEntity {
  #pokemon;
  #trainerInfo;

  constructor(pokemonEntities = [], trainerInfo = undefined) {
    this.#pokemon = new Map();
    pokemonEntities.forEach((entity) => this.#pokemon.set(entity.name, entity));
    this.#trainerInfo = trainerInfo;
  }

  hasPokemon(name) { return this.#pokemon.has(name); }
  getPokemon(name) { return this.#pokemon.get(name) ?? null; }
  listPokemon() { return [...this.#pokemon.values()]; }
  get trainerInfo() { return this.#trainerInfo; }
  get size() { return this.#pokemon.size; }

  addPokemon(entity) {
    if (this.#pokemon.has(entity.name)) {
      const error = new Error(`${entity.name} already exists in this team`);
      error.code = 'DUPLICATE_POKEMON';
      throw error;
    }
    this.#pokemon.set(entity.name, entity);
  }

  removePokemon(name) {
    const entity = this.#pokemon.get(name);
    if (!entity) return null;
    this.#pokemon.delete(name);
    return entity;
  }

  updatePokemon(name, entity) {
    if (!this.#pokemon.has(name)) {
      const error = new Error(`${name} doesn't exist in this team`);
      error.code = 'NOT_FOUND';
      throw error;
    }
    this.#pokemon.delete(name);
    this.#pokemon.set(entity.name, entity);
  }

  clear() { this.#pokemon.clear(); }

  toJSON() {
    const result = {};
    for (const [name, entity] of this.#pokemon) result[name] = entity.toJSON();
    if (this.#trainerInfo !== undefined) result.trainerInfo = this.#trainerInfo;
    return result;
  }

  static fromStoredDoc(doc, models) {
    if (!doc) return new TeamEntity([]);
    const entities = Object.entries(doc)
      .filter(([key]) => key !== 'trainerInfo')
      .map(([, pokemonDoc]) => PokemonEntity.fromStoredDoc(pokemonDoc, models));
    return new TeamEntity(entities, doc.trainerInfo);
  }
}

module.exports = TeamEntity;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Backend && npx jest __tests__/unit/teams/TeamEntity.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/teams/TeamEntity.js Backend/__tests__/unit/teams/TeamEntity.test.js
git commit -m "feat: introduce TeamEntity to encapsulate team roster + trainerInfo"
```

---

### Task 4: Extract `game-data/loadModels.js`

Pure relocation — `loadModels`/`getModels`/`avaliableTMS`/`megaStones` move out of `Config/jsonOptions.js` (which mixes them with box/team repository logic) into their own file. No behavior change. `Config/jsonOptions.js` itself is not deleted yet — Tasks 5/6 remove the rest of it, Task 15 deletes the empty file.

**Files:**
- Create: `Backend/game-data/loadModels.js`
- Modify: `Backend/server.js` (update the `loadModels` require)

- [ ] **Step 1: Create `Backend/game-data/loadModels.js`**

```javascript
const fs = require('fs');
const path = require('path');
const { fetchModels } = require('../Config/mongodbOptions');

let models = {};

const loadModels = async () => {
  models = await fetchModels();
};

const getModels = () => models;

const avaliableTMS = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'Models', 'avaliableTutors+TMS', 'avaliableTMS.json'),
    'utf8',
  ),
);
const megaStones = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'Models', 'megaStones.json'), 'utf8'),
);

module.exports = { loadModels, getModels, avaliableTMS, megaStones };
```

- [ ] **Step 2: Update `Backend/server.js`**

Change:
```javascript
const { loadModels } = require('./Config/jsonOptions');
```
to:
```javascript
const { loadModels } = require('./game-data/loadModels');
```

- [ ] **Step 3: Remove the extracted exports from `Backend/Config/jsonOptions.js`**

Delete the `loadModels`, `getModels`, `avaliableTMS`, `megaStones` declarations (lines 1–33 of the current file) and their entries in `module.exports`, leaving only the box/team functions (removed in Tasks 5–6) until this file is deleted entirely in Task 15.

- [ ] **Step 4: Verify nothing else broke**

Run: `cd Backend && npx jest --testPathPatterns=__tests__/unit`
Expected: Same pass/fail status as before this task (no new failures introduced by this specific change — remaining failures at this point in the plan are expected, since downstream files still reference the old `jsonOptions` box/team functions until Tasks 5–9 land).

- [ ] **Step 5: Commit**

```bash
git add Backend/game-data/loadModels.js Backend/server.js Backend/Config/jsonOptions.js
git commit -m "refactor: extract game-data model loading out of Config/jsonOptions.js"
```

---

### Task 5: `BoxRepository` — the only file that touches the `myBoxes` collection

**Files:**
- Create: `Backend/boxes/BoxRepository.js`
- Test: `Backend/__tests__/integration/boxes/BoxRepository.test.js` (uses `mongodb-memory-server`, already a devDependency, same pattern as the existing `__tests__/integration/mongodb.test.js`)

- [ ] **Step 1: Write the failing tests**

```javascript
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

jest.mock('../../../infrastructure/redis/redisClient', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  delPattern: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../game-data/loadModels', () => ({
  getModels: () => ({ natures: {}, items: {} }),
}));

let mongoServer;
let client;
let BoxRepository;
let BoxEntity;
let PokemonEntity;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  client = new MongoClient(mongoServer.getUri());
  await client.connect();
  jest.doMock('../../../Config/mongodbOptions', () => ({ db: client.db('test') }));
  BoxRepository = require('../../../boxes/BoxRepository');
  BoxEntity = require('../../../boxes/BoxEntity');
  PokemonEntity = require('../../../pokemon/PokemonEntity');
});

afterAll(async () => {
  await client.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await client.db('test').collection('myBoxes').deleteMany({});
});

const makePokemon = (name) =>
  PokemonEntity.create({
    name, form: name, gender: 'N', level: 50, nature: 'Hardy', item: '',
    ability_id: 'Levitate', move_ids: [],
    EVs: { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
    IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
    player: 1,
  });

describe('BoxRepository', () => {
  test('loadAll returns [] for a user with no boxes', async () => {
    const boxes = await BoxRepository.loadAll('user-1');
    expect(boxes).toEqual([]);
  });

  test('saveAll then loadAll round-trips box contents', async () => {
    const box = new BoxEntity([makePokemon('Ditto')]);
    await BoxRepository.saveAll('user-1', [box]);
    const loaded = await BoxRepository.loadAll('user-1');
    expect(loaded).toHaveLength(1);
    expect(loaded[0].hasPokemon('Ditto')).toBe(true);
  });

  test('saveAll scopes boxes to userId — another user sees none', async () => {
    await BoxRepository.saveAll('user-1', [new BoxEntity([makePokemon('Ditto')])]);
    const otherUsersBoxes = await BoxRepository.loadAll('user-2');
    expect(otherUsersBoxes).toEqual([]);
  });

  test('loadOne returns undefined for an out-of-range index', async () => {
    await BoxRepository.saveAll('user-1', [new BoxEntity([])]);
    expect(await BoxRepository.loadOne('user-1', 5)).toBeUndefined();
  });

  test('reassignOwner moves all boxes from one userId to another', async () => {
    await BoxRepository.saveAll('guest-1', [new BoxEntity([makePokemon('Ditto')])]);
    const modifiedCount = await BoxRepository.reassignOwner('guest-1', 'auth-user-1');
    expect(modifiedCount).toBe(1);
    expect(await BoxRepository.loadAll('guest-1')).toEqual([]);
    expect((await BoxRepository.loadAll('auth-user-1'))[0].hasPokemon('Ditto')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Backend && npx jest __tests__/integration/boxes/BoxRepository.test.js`
Expected: FAIL — `Cannot find module '../../../boxes/BoxRepository'`

- [ ] **Step 3: Implement `BoxRepository`**

```javascript
const { db } = require('../Config/mongodbOptions');
const redis = require('../infrastructure/redis/redisClient');
const { getModels } = require('../game-data/loadModels');
const BoxEntity = require('./BoxEntity');

const BOX_SCHEMA_VERSION = process.env.BOX_SCHEMA_VERSION || '1';
const BOX_CACHE_TTL = 600;
const BOX_COUNT_TTL = 30;

const boxCacheKey = (userId, index) => `box:${userId}:${index}:v${BOX_SCHEMA_VERSION}`;
const boxCountCacheKey = (userId) => `boxcount:${userId}`;

const loadAll = async (userId) => {
  const docs = await db.collection('myBoxes').find({ userId }).toArray();
  if (!docs.length) return [];
  const models = getModels();
  return docs.map(({ _id, userId: _uid, ...boxDoc }) => BoxEntity.fromStoredDoc(boxDoc, models));
};

const saveAll = async (userId, boxes) => {
  await db.collection('myBoxes').deleteMany({ userId });
  if (boxes.length > 0) {
    await db.collection('myBoxes').insertMany(boxes.map((box) => ({ ...box.toJSON(), userId })));
  }
};

const loadOne = async (userId, index) => {
  const key = boxCacheKey(userId, index);
  const cached = await redis.get(key);
  if (cached) return BoxEntity.fromStoredDoc(cached, getModels());

  const docs = await db
    .collection('myBoxes')
    .find({ userId })
    .sort({ _id: 1 })
    .skip(index)
    .limit(1)
    .toArray();
  if (!docs.length) return undefined;
  const { _id, userId: _uid, ...boxDoc } = docs[0];
  await redis.set(key, boxDoc, BOX_CACHE_TTL);
  return BoxEntity.fromStoredDoc(boxDoc, getModels());
};

const invalidateOne = async (userId, index) => {
  await redis.del(boxCacheKey(userId, index));
};

const invalidateAll = async (userId) => {
  await redis.delPattern(`box:${userId}:*`);
};

const getCachedCount = async (userId) => {
  const cached = await redis.get(boxCountCacheKey(userId));
  return cached !== null ? Number(cached) : null;
};

const setCachedCount = async (userId, count) => {
  await redis.set(boxCountCacheKey(userId), count, BOX_COUNT_TTL);
};

const invalidateCachedCount = async (userId) => {
  await redis.del(boxCountCacheKey(userId));
};

const preWarmCache = async (userId, boxes) => {
  await Promise.all(
    boxes.map(async (box, index) => {
      const key = boxCacheKey(userId, index);
      const cached = await redis.get(key);
      if (!cached) await redis.set(key, box.toJSON(), BOX_CACHE_TTL);
    }),
  );
};

const reassignOwner = async (oldUserId, newUserId) => {
  const result = await db
    .collection('myBoxes')
    .updateMany({ userId: oldUserId }, { $set: { userId: newUserId } });
  return result.modifiedCount;
};

module.exports = {
  loadAll,
  saveAll,
  loadOne,
  invalidateOne,
  invalidateAll,
  getCachedCount,
  setCachedCount,
  invalidateCachedCount,
  preWarmCache,
  reassignOwner,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Backend && npx jest __tests__/integration/boxes/BoxRepository.test.js`
Expected: PASS

- [ ] **Step 5: Remove the absorbed functions from `Backend/Config/jsonOptions.js`**

Delete `loadMyBoxes`, `saveMyBoxes`, `loadBox`, `invalidateBoxCache`, `invalidateAllBoxCache`, `getCachedBoxCount`, `setBoxCountCache`, `invalidateBoxCountCache`, `preWarmBoxCache`, `BOX_SCHEMA_VERSION`, `BOX_CACHE_TTL`, `BOX_COUNT_TTL`, `boxCacheKey`, `boxCountCacheKey`, and their `module.exports` entries. Only the team functions (removed in Task 6) remain after this step.

- [ ] **Step 6: Commit**

```bash
git add Backend/boxes/BoxRepository.js Backend/__tests__/integration/boxes/BoxRepository.test.js Backend/Config/jsonOptions.js
git commit -m "feat: introduce BoxRepository as the sole owner of the myBoxes collection"
```

---

### Task 6: `TeamRepository` — the only file that touches `myTeamSets`/`enemyTeamSets`

Expands the existing single-method `infrastructure/repositories/TeamRepository.js` to own every team read/write, including what `teamControllers.js`/`pokemonControllers.js` currently do directly against `Config/jsonOptions.js`. Preserves the `saveFullTeam`/raw-`bench`-array quirk from Assumption #3 exactly — `loadAllTeams` and `saveAllTeams` pass through anything already stored as a plain array untouched rather than forcing it into a `TeamEntity`.

**Files:**
- Create: `Backend/teams/TeamRepository.js`
- Test: `Backend/__tests__/integration/teams/TeamRepository.test.js`
- Delete (superseded): `Backend/infrastructure/repositories/TeamRepository.js`, `Backend/__tests__/unit/TeamRepository.test.js` (its cases are subsumed by the new integration test below, particularly the version-conflict tests)

- [ ] **Step 1: Write the failing tests**

```javascript
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

jest.mock('../../../infrastructure/redis/redisClient', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../game-data/loadModels', () => ({
  getModels: () => ({ natures: {}, items: {} }),
}));

jest.mock('../../../enemy-preview/enemyPreviewService', () => ({
  invalidateEnemyPreview: jest.fn().mockResolvedValue(undefined),
}));

let mongoServer;
let client;
let TeamRepository;
let TeamEntity;
let PokemonEntity;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  client = new MongoClient(mongoServer.getUri());
  await client.connect();
  jest.doMock('../../../Config/mongodbOptions', () => ({ db: client.db('test') }));
  TeamRepository = require('../../../teams/TeamRepository');
  TeamEntity = require('../../../teams/TeamEntity');
  PokemonEntity = require('../../../pokemon/PokemonEntity');
});

afterAll(async () => {
  await client.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await client.db('test').collection('myTeamSets').deleteMany({});
  await client.db('test').collection('enemyTeamSets').deleteMany({});
});

const makePokemon = (name, overrides = {}) =>
  PokemonEntity.create({
    name, form: name, gender: 'N', level: 50, nature: 'Hardy', item: '',
    ability_id: 'Levitate', move_ids: [],
    EVs: { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
    IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
    player: 1,
    ...overrides,
  });

describe('TeamRepository team CRUD', () => {
  test('addTeam creates an empty TeamEntity, findTeam retrieves it', async () => {
    await TeamRepository.addTeam(1, 'user-1', 'Main');
    const team = await TeamRepository.findTeam(1, 'Main', 'user-1');
    expect(team.size).toBe(0);
  });

  test('addTeam throws when the team name already exists', async () => {
    await TeamRepository.addTeam(1, 'user-1', 'Main');
    await expect(TeamRepository.addTeam(1, 'user-1', 'Main')).rejects.toThrow(
      'Main already exists in my box',
    );
  });

  test('findTeam throws when the team does not exist', async () => {
    await expect(TeamRepository.findTeam(1, 'Nope', 'user-1')).rejects.toThrow(
      "can't find Nope among my teams",
    );
  });

  test('removeTeam deletes the team', async () => {
    await TeamRepository.addTeam(1, 'user-1', 'Main');
    await TeamRepository.removeTeam(1, 'user-1', 'Main');
    await expect(TeamRepository.findTeam(1, 'Main', 'user-1')).rejects.toThrow(
      "can't find Main among my teams",
    );
  });

  test('removeAllTeams clears every team for that player/user', async () => {
    await TeamRepository.addTeam(1, 'user-1', 'Main');
    await TeamRepository.removeAllTeams(1, 'user-1');
    const teams = await TeamRepository.loadAllTeams(1, 'user-1');
    expect(teams).toEqual({});
  });

  test('replaceTeamContents stores a raw array, preserved as-is on read', async () => {
    await TeamRepository.addTeam(1, 'user-1', 'Main');
    await TeamRepository.replaceTeamContents(1, 'user-1', 'Main', [{ name: 'Ditto' }]);
    const teams = await TeamRepository.loadAllTeams(1, 'user-1');
    expect(Array.isArray(teams.Main)).toBe(true);
    expect(teams.Main).toEqual([{ name: 'Ditto' }]);
  });
});

describe('TeamRepository.savePokemon', () => {
  test('adds a new pokemon into an existing team at version 1', async () => {
    await TeamRepository.addTeam(1, 'user-1', 'Main');
    const entity = makePokemon('Ditto');
    const saved = await TeamRepository.savePokemon(entity, 'Main', 'Ditto', 'user-1');
    expect(saved.version).toBe(1);
    const team = await TeamRepository.findTeam(1, 'Main', 'user-1');
    expect(team.getPokemon('Ditto').version).toBe(1);
  });

  test('rejects saving a Pokemon owned by a different user', async () => {
    await TeamRepository.addTeam(1, 'user-1', 'Main');
    const entity = makePokemon('Ditto', { userId: 'someone-else' });
    await expect(
      TeamRepository.savePokemon(entity, 'Main', 'Ditto', 'user-1'),
    ).rejects.toMatchObject({ status: 403 });
  });

  test('throws 409 on a stale version conflict', async () => {
    await TeamRepository.addTeam(1, 'user-1', 'Main');
    const first = makePokemon('Ditto');
    await TeamRepository.savePokemon(first, 'Main', 'Ditto', 'user-1');
    // Saving the same starting version again should now conflict with the v1 already stored.
    const staleAttempt = makePokemon('Ditto');
    await expect(
      TeamRepository.savePokemon(staleAttempt, 'Main', 'Ditto', 'user-1'),
    ).rejects.toMatchObject({ status: 409 });
  });

  test('throws when the team does not exist', async () => {
    const entity = makePokemon('Ditto');
    await expect(
      TeamRepository.savePokemon(entity, 'Nonexistent', 'Ditto', 'user-1'),
    ).rejects.toThrow('Team "Nonexistent" not found');
  });
});

describe('TeamRepository.reassignOwner', () => {
  test('moves all myTeamSets documents from one userId to another', async () => {
    await TeamRepository.addTeam(1, 'guest-1', 'Main');
    const modifiedCount = await TeamRepository.reassignOwner('guest-1', 'auth-user-1');
    expect(modifiedCount).toBe(1);
    await expect(TeamRepository.findTeam(1, 'Main', 'guest-1')).rejects.toThrow();
    const team = await TeamRepository.findTeam(1, 'Main', 'auth-user-1');
    expect(team.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Backend && npx jest __tests__/integration/teams/TeamRepository.test.js`
Expected: FAIL — `Cannot find module '../../../teams/TeamRepository'`

- [ ] **Step 3: Implement `TeamRepository`**

```javascript
const { db } = require('../Config/mongodbOptions');
const redis = require('../infrastructure/redis/redisClient');
const { getModels } = require('../game-data/loadModels');
const TeamEntity = require('./TeamEntity');

const P2_TEAMS_KEY = 'p2:teams';
const P2_TEAMS_TTL = 86400;

const collectionFor = (player) => (player === 1 ? 'myTeamSets' : 'enemyTeamSets');

const loadRawTeams = async (player, userId) => {
  if (player === 2) {
    const cached = await redis.get(P2_TEAMS_KEY);
    if (cached) return cached;
  }
  const query = player === 1 ? { userId } : {};
  const doc = await db.collection(collectionFor(player)).findOne(query);
  if (!doc) return {};
  const { _id, userId: _uid, ...teams } = doc;
  if (player === 2) await redis.set(P2_TEAMS_KEY, teams, P2_TEAMS_TTL);
  return teams;
};

const saveRawTeams = async (player, userId, rawTeams) => {
  if (player === 1) {
    await db
      .collection(collectionFor(player))
      .replaceOne({ userId }, { ...rawTeams, userId }, { upsert: true });
  } else {
    await db.collection(collectionFor(player)).replaceOne({}, rawTeams, { upsert: true });
    await redis.del(P2_TEAMS_KEY);
    const { invalidateEnemyPreview } = require('../enemy-preview/enemyPreviewService');
    await invalidateEnemyPreview();
  }
};

const loadAllTeams = async (player, userId) => {
  const rawTeams = await loadRawTeams(player, userId);
  const models = getModels();
  const teams = {};
  for (const [teamName, rawTeam] of Object.entries(rawTeams)) {
    teams[teamName] = Array.isArray(rawTeam) ? rawTeam : TeamEntity.fromStoredDoc(rawTeam, models);
  }
  return teams;
};

const findTeam = async (player, teamName, userId) => {
  const teams = await loadAllTeams(player, userId);
  if (!(teamName in teams))
    throw new Error(
      `can't find ${teamName} ${player === 1 ? 'among my teams' : 'among the enemy teams'}`,
    );
  return teams[teamName];
};

const saveAllTeams = async (player, userId, teams) => {
  const rawTeams = {};
  for (const [teamName, team] of Object.entries(teams)) {
    rawTeams[teamName] = Array.isArray(team) ? team : team.toJSON();
  }
  await saveRawTeams(player, userId, rawTeams);
};

const addTeam = async (player, userId, teamName) => {
  const teams = await loadAllTeams(player, userId);
  if (teamName in teams) {
    const error = new Error(
      `${teamName} already exists ${player === 1 ? 'in my box' : ' among the enemy teams'}`,
    );
    error.code = 'DUPLICATE_TEAM';
    throw error;
  }
  teams[teamName] = new TeamEntity([]);
  await saveAllTeams(player, userId, teams);
  return teams;
};

const removeTeam = async (player, userId, teamName) => {
  const teams = await loadAllTeams(player, userId);
  if (!(teamName in teams)) {
    const error = new Error(
      `couldn't find ${teamName} ${player === 1 ? 'in my box' : ' among the enemy teams'}`,
    );
    error.code = 'NOT_FOUND';
    throw error;
  }
  delete teams[teamName];
  await saveAllTeams(player, userId, teams);
  return teams;
};

const removeAllTeams = async (player, userId) => {
  await saveRawTeams(player, userId, {});
};

const replaceTeamContents = async (player, userId, teamName, bench) => {
  const rawTeams = await loadRawTeams(player, userId);
  rawTeams[teamName] = bench;
  await saveRawTeams(player, userId, rawTeams);
};

const savePokemon = async (entity, teamName, pokemonName, userId) => {
  if (entity.userId !== undefined && entity.userId !== userId) {
    const forbidden = new Error(
      'Forbidden: cannot save a Pokémon that belongs to another user',
    );
    forbidden.status = 403;
    throw forbidden;
  }

  const teams = await loadAllTeams(entity.player, userId);
  const team = teams[teamName];
  if (!team || Array.isArray(team)) throw new Error(`Team "${teamName}" not found`);

  const stored = team.getPokemon(pokemonName);
  if (stored && stored.version !== entity.version) {
    const conflict = new Error(
      `Conflict: ${pokemonName} was modified after this draft was opened (expected v${entity.version}, found v${stored.version}). Re-activate to get the latest version.`,
    );
    conflict.status = 409;
    throw conflict;
  }

  const toSave = entity.prepareForSave();
  if (stored) team.updatePokemon(pokemonName, toSave);
  else team.addPokemon(toSave);

  await saveAllTeams(entity.player, userId, teams);
  return toSave;
};

const reassignOwner = async (oldUserId, newUserId) => {
  const result = await db
    .collection('myTeamSets')
    .updateMany({ userId: oldUserId }, { $set: { userId: newUserId } });
  return result.modifiedCount;
};

module.exports = {
  loadAllTeams,
  findTeam,
  saveAllTeams,
  addTeam,
  removeTeam,
  removeAllTeams,
  replaceTeamContents,
  savePokemon,
  reassignOwner,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Backend && npx jest __tests__/integration/teams/TeamRepository.test.js`
Expected: PASS

- [ ] **Step 5: Remove the absorbed functions from `Backend/Config/jsonOptions.js`, delete the file**

Delete `loadTeams`, `saveTeams`, `findTeam` and their `module.exports` entries — this empties `jsonOptions.js` completely (box functions removed in Task 5, model-loading functions removed in Task 4). Delete `Backend/Config/jsonOptions.js` now rather than waiting for Task 15, since nothing valid remains in it.

- [ ] **Step 6: Delete the superseded files**

```bash
git rm Backend/infrastructure/repositories/TeamRepository.js Backend/__tests__/unit/TeamRepository.test.js
```

- [ ] **Step 7: Commit**

```bash
git add Backend/teams/TeamRepository.js Backend/__tests__/integration/teams/TeamRepository.test.js
git commit -m "feat: introduce TeamRepository as the sole owner of team collections"
```

---

### Task 7: Import pipeline — `createFromImportText`, fixed `forms/checkMega.js`

Replaces `Services/pokemonService.js: createPokemon` (built a full hydrated blob by hand) with a function that builds a validated `PokemonEntity`. Also fixes both `formService.js` bugs (Assumption from the design doc): `checkMega`'s uncalled `getModels`, and `addMega`'s undefined `species`/`species2` references — both now correctly use `getModels()` from `game-data/loadModels`. Deletes the dead `practiceText`/`dummyPokemon` fixtures and their module-load self-test calls.

**Files:**
- Create: `Backend/pokemon/createFromImportText.js`
- Create: `Backend/forms/checkMega.js`
- Test: `Backend/__tests__/unit/pokemon/createFromImportText.test.js`
- Test: `Backend/__tests__/unit/forms/checkMega.test.js`
- Delete (superseded): `Backend/Services/pokemonService.js`, `Backend/Services/formService.js`

- [ ] **Step 1: Write the failing tests for `createFromImportText`**

```javascript
jest.mock('../../../game-data/loadModels', () => ({
  getModels: () => ({
    species2: {
      Blaziken: {
        name: 'Blaziken',
        ID: 257,
        sprite: 'sprite-url',
        type1: 'Fire',
        type2: 'Fighting',
        abilities: ['Blaze', 'Speed Boost'],
        forms: [],
      },
    },
    items: { 'Wide Lens': { name: 'Wide Lens' } },
    natures: { Jolly: { increase: 'Spe', decrease: 'SpA' } },
    movesList: {
      'High Jump Kick': {}, 'Blaze Kick': {}, 'Brave Bird': {}, Detect: {},
    },
  }),
  megaStones: {},
}));

jest.mock('../../../Config/jsOptions.js', () => ({
  bannedAbilities: {},
  abilityExceptions: {},
}));

const createFromImportText = require('../../../pokemon/createFromImportText');

const importText = `Blaziken
Level: 47
Jolly Nature
Ability: Speed Boost
EVs: 252 Atk / 252 Spe
IVs: 30 Atk / 30 SpD
- High Jump Kick
- Blaze Kick
- Brave Bird
- Detect`;

describe('createFromImportText', () => {
  test('parses import text into a validated PokemonEntity', () => {
    const entity = createFromImportText(importText, 1);
    expect(entity.name).toBe('Blaziken');
    expect(entity.level).toBe(47);
    expect(entity.nature).toBe('Jolly');
    expect(entity.ability_id).toBe('Speed Boost');
    expect(entity.move_ids).toEqual(['High Jump Kick', 'Blaze Kick', 'Brave Bird', 'Detect']);
  });

  test('infers gender N for a genderless-listed species with no (M)/(F) in the text', () => {
    const entity = createFromImportText(importText, 1);
    expect(entity.gender).toBe('N'); // Blaziken isn't in any fixed-gender list and text has no (M)/(F)
  });

  test('throws for an unknown species', () => {
    const unknownText = importText.replace('Blaziken', 'NotAPokemon');
    expect(() => createFromImportText(unknownText, 1)).toThrow("isn't a valid Pokemon");
  });

  test('throws when pokemonText is missing', () => {
    expect(() => createFromImportText('', 1)).toThrow("Pokemon text can't be found");
  });

  test('throws when pokemonText is not a string', () => {
    expect(() => createFromImportText({}, 1)).toThrow("Pokemon data isn't a string");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Backend && npx jest __tests__/unit/pokemon/createFromImportText.test.js`
Expected: FAIL — `Cannot find module '../../../pokemon/createFromImportText'`

- [ ] **Step 3: Implement `createFromImportText`**

Copy the `femalePokemon`, `malePokemon`, and `genderlessNames` arrays verbatim from `Backend/Services/pokemonService.js` lines 153–191, 193–219, and 221–377 respectively (before that file is deleted in this same task) into the `FEMALE_ONLY_SPECIES`/`MALE_ONLY_SPECIES`/`GENDERLESS_SPECIES` sets below.

```javascript
const { getModels, megaStones } = require('../game-data/loadModels');
const { bannedAbilities, abilityExceptions } = require('../Config/jsOptions.js');
const { getPokemonInfo } = require('../import/parsePokemonText');
const legalAbility = require('../legality/legalAbilities');
const PokemonEntity = require('./PokemonEntity');

// Copied verbatim from the old Backend/Services/pokemonService.js (lines 153-191) --
// species with a permanently fixed gender.
const FEMALE_ONLY_SPECIES = new Set([
  'Alcremie', 'Blissey', 'Bounsweet', 'Chansey', 'Cresselia', 'Enamorus', 'Flabébé',
  'Floette', 'Florges', 'Froslass', 'Happiny', 'Hatenna', 'Hatterene', 'Hattrem',
  'Illumise', 'Jynx', 'Kangaskhan', 'Latias', 'Lilligant', 'Mandibuzz', 'Milcery',
  'Miltank', 'Nidoqueen', 'Nidoran♀', 'Nidorina', 'Ogerpon', 'Petilil', 'Salazzle',
  'Smoochum', 'Steenee', 'Tinkatink', 'Tinkaton', 'Tinkatuff', 'Tsareena', 'Vespiquen',
  'Vullaby', 'Wormadam',
]);

// Copied verbatim from pokemonService.js (lines 193-219).
const MALE_ONLY_SPECIES = new Set([
  'Braviary', 'Fezandipiti', 'Gallade', 'Grimmsnarl', 'Hitmonchan', 'Hitmonlee',
  'Hitmontop', 'Impidimp', 'Landorus', 'Latios', 'Morgrem', 'Mothim', 'Munkidori',
  'Nidoking', 'Nidoran♂', 'Nidorino', 'Okidogi', 'Rufflet', 'Sawk', 'Tauros', 'Throh',
  'Thundurus', 'Tornadus', 'Tyrogue', 'Volbeat',
]);

// Copied verbatim from pokemonService.js (lines 221-377) -- the full genderless list.
const GENDERLESS_SPECIES = new Set([
  'Magnemite', 'Magneton', 'Voltorb', 'Electrode', 'Staryu', 'Starmie', 'Ditto',
  'Porygon', 'Articuno', 'Zapdos', 'Moltres', 'Mewtwo', 'Mew', 'Unown', 'Porygon2',
  'Raikou', 'Entei', 'Suicune', 'Lugia', 'Ho-Oh', 'Celebi', 'Shedinja', 'Lunatone',
  'Solrock', 'Baltoy', 'Claydol', 'Beldum', 'Metang', 'Metagross', 'Regirock',
  'Regice', 'Registeel', 'Kyogre', 'Groudon', 'Rayquaza', 'Jirachi', 'Deoxys',
  'Bronzor', 'Bronzong', 'Magnezone', 'Porygon-Z', 'Rotom', 'Uxie', 'Mesprit',
  'Azelf', 'Dialga', 'Palkia', 'Regigigas', 'Giratina', 'Phione', 'Manaphy',
  'Darkrai', 'Shaymin', 'Arceus', 'Victini', 'Klink', 'Klang', 'Klinklang',
  'Cryogonal', 'Golett', 'Golurk', 'Cobalion', 'Terrakion', 'Virizion', 'Reshiram',
  'Zekrom', 'Kyurem', 'Keldeo', 'Meloetta', 'Genesect', 'Carbink', 'Xerneas',
  'Yveltal', 'Zygarde', 'Diancie', 'Hoopa', 'Volcanion', 'Type: Null', 'Silvally',
  'Minior', 'Dhelmise', 'Tapu Koko', 'Tapu Lele', 'Tapu Bulu', 'Tapu Fini', 'Cosmog',
  'Cosmoem', 'Solgaleo', 'Lunala', 'Nihilego', 'Buzzwole', 'Pheromosa', 'Xurkitree',
  'Celesteela', 'Kartana', 'Guzzlord', 'Necrozma', 'Magearna', 'Marshadow', 'Poipole',
  'Naganadel', 'Stakataka', 'Blacephalon', 'Zeraora', 'Meltan', 'Melmetal', 'Sinistea',
  'Polteageist', 'Falinks', 'Dracozolt', 'Arctozolt', 'Dracovish', 'Arctovish',
  'Zacian', 'Zamazenta', 'Eternatus', 'Zarude', 'Regieleki', 'Regidrago', 'Glastrier',
  'Spectrier', 'Calyrex', 'Tandemaus', 'Maushold', 'Great Tusk', 'Scream Tail',
  'Brute Bonnet', 'Flutter Mane', 'Slither Wing', 'Sandy Shocks', 'Iron Treads',
  'Iron Bundle', 'Iron Hands', 'Iron Jugulis', 'Iron Moth', 'Iron Thorns',
  'Gimmighoul', 'Gholdengo', 'Wo-Chien', 'Chien-Pao', 'Ting-Lu', 'Chi-Yu',
  'Roaring Moon', 'Iron Valiant', 'Koraidon', 'Miraidon', 'Walking Wake',
  'Iron Leaves', 'Poltchageist', 'Sinistcha', 'Gouging Fire', 'Raging Bolt',
  'Iron Boulder', 'Iron Crown', 'Pecharunt',
]);

const inferGender = (name, parsedGender) => {
  if (FEMALE_ONLY_SPECIES.has(name)) return 'F';
  if (MALE_ONLY_SPECIES.has(name)) return 'M';
  if (GENDERLESS_SPECIES.has(name)) return 'N';
  if (parsedGender === 'M' || parsedGender === 'F') return parsedGender;
  // Original pipeline left this as the unvalidated literal 'Both' -- see plan Assumption #2.
  return 'N';
};

const createFromImportText = (pokemonText, player) => {
  if (!pokemonText) throw new Error("Pokemon text can't be found");
  if (typeof pokemonText !== 'string') throw new Error("Pokemon data isn't a string");

  const { species2, items, natures, movesList } = getModels();
  const parsed = getPokemonInfo(pokemonText, items, megaStones, natures, movesList);

  if (!species2[parsed.name]) throw new Error(`${parsed.name} isn't a valid Pokemon`);
  const species = species2[parsed.name];

  const abilityCases = [
    ...Object.values(bannedAbilities),
    ...Object.values(abilityExceptions).map((exceptionAbility) => exceptionAbility[1]),
  ];
  let resolvedAbility = parsed.ability;
  if (!species.abilities.includes(resolvedAbility) && !abilityCases.includes(resolvedAbility)) {
    resolvedAbility = species.abilities[0];
  }
  const finalAbility =
    player === 1
      ? legalAbility(parsed.name, resolvedAbility, bannedAbilities, abilityExceptions)
      : resolvedAbility;

  return PokemonEntity.create({
    name: parsed.name,
    form: species.name,
    gender: inferGender(parsed.name, parsed.gender),
    level: parsed.level,
    nature: parsed.nature,
    item: parsed.item,
    ability_id: finalAbility,
    move_ids: parsed.moves,
    EVs: parsed.EVs,
    IVs: parsed.IVs,
    player,
  });
};

module.exports = createFromImportText;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Backend && npx jest __tests__/unit/pokemon/createFromImportText.test.js`
Expected: PASS

- [ ] **Step 5: Write the failing tests for `forms/checkMega.js`**

```javascript
jest.mock('../../../game-data/loadModels', () => ({
  getModels: () => ({
    species2: {
      'Blaziken-Mega': { name: 'Blaziken-Mega', abilities: ['Speed Boost'] },
      Blaziken: { name: 'Blaziken', abilities: ['Blaze', 'Speed Boost'] },
    },
  }),
}));

const { checkMega, addMega } = require('../../../forms/checkMega');

describe('checkMega', () => {
  test('detects a -Mega suffix in import text', () => {
    expect(checkMega('Blaziken-Mega\nLevel: 50')).toBe(true);
  });

  test('detects Greninja-Ash by name', () => {
    expect(checkMega('Greninja-Ash\nLevel: 50')).toBe(true);
  });

  test('returns false for a normal species', () => {
    expect(checkMega('Blaziken\nLevel: 50')).toBe(false);
  });
});

describe('addMega', () => {
  test('throws a clear error when the mega species is not in the database', () => {
    expect(() => addMega('Not-A-Mega @ Item\nLevel: 50\nAbility: Blaze', 1)).toThrow(
      "isn't a pokemon in the database (addMega)",
    );
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `cd Backend && npx jest __tests__/unit/forms/checkMega.test.js`
Expected: FAIL — `Cannot find module '../../../forms/checkMega'`

- [ ] **Step 7: Implement `forms/checkMega.js` (both bugs fixed)**

```javascript
const { getModels } = require('../game-data/loadModels');

const BANNED_IMPORT_FORMS = ['-Mega', 'Greninja-Ash'];

const checkMega = (importedPokemon) => {
  if (typeof importedPokemon === 'string') {
    const firstLine = importedPokemon.split('\n')[0];
    const name = firstLine.split('@')[0];
    return BANNED_IMPORT_FORMS.some((bannedForm) => name.includes(bannedForm));
  }
  if (typeof importedPokemon === 'object' && importedPokemon !== null) {
    return BANNED_IMPORT_FORMS.some((bannedForm) => importedPokemon.name.includes(bannedForm));
  }
  return false;
};

const addMega = (importText, player) => {
  // Bug fix: the original called `getModels` without invoking it, so `species2` was
  // always undefined here. Now correctly calls getModels().
  const { species2 } = getModels();
  const firstLine = importText.split('\n')[0];
  const [megaName, originalItem] = firstLine.split('@');
  const isAshGreninja = megaName === 'Greninja-Ash';

  const normalName = !isAshGreninja ? megaName.split('-Mega')[0] : 'Greninja';
  const isRayquaza = normalName === 'Rayquaza';
  const originalAbility = importText
    .split('\n')
    .find((line) => line.includes('Ability'))
    .split('Ability: ')[1];

  if (!species2[megaName]) throw new Error(`${megaName} isn't a pokemon in the database (addMega)`);
  const megaPokemon = species2[megaName];

  const abilitiesIndex = megaPokemon.abilities.includes(originalAbility)
    ? megaPokemon.abilities.findIndex((ability) => ability === originalAbility)
    : 0;

  // Bug fix: the original referenced a bare `species` identifier that was never
  // imported or defined -- this would throw a ReferenceError if ever invoked.
  const normalPokemon = species2[normalName];

  const newFirstLine = normalName + (!isRayquaza ? ' @ Mega Stone' : ` @ ${originalItem}` || '');

  const newImportText = [newFirstLine, ...importText.split('\n').slice(1)]
    .map((line) => {
      if (line.includes('Ability')) return 'Ability: ' + normalPokemon.abilities[abilitiesIndex];
      return line;
    })
    .join('\n');

  const createFromImportText = require('../pokemon/createFromImportText');
  return createFromImportText(newImportText, player);
};

module.exports = { checkMega, addMega };
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd Backend && npx jest __tests__/unit/forms/checkMega.test.js`
Expected: PASS

- [ ] **Step 9: Delete the superseded files**

```bash
git rm Backend/Services/pokemonService.js Backend/Services/formService.js
```

(`changeActiveForm`, the other export of `formService.js`, is relocated separately in Task 8 — hold this `git rm` until Task 8's `battling/changeActiveForm.js` exists, or do Task 8 first and this deletion second.)

- [ ] **Step 10: Commit**

```bash
git add Backend/pokemon/createFromImportText.js Backend/forms/checkMega.js \
  Backend/__tests__/unit/pokemon/createFromImportText.test.js Backend/__tests__/unit/forms/checkMega.test.js
git commit -m "feat: rewrite import pipeline onto PokemonEntity, fix formService bugs"
```

---

### Task 8: Battling feature relocation

Pure relocation, no behavior change except dropping one dead unused import. `damageController.js` and `CalculationService.js` operate on plain request-body data, not `PokemonEntity` — matching the audit's finding that Battling is currently stateless, this task doesn't change that.

**Files:**
- Create: `Backend/battling/changeActiveForm.js` (moved out of `Services/formService.js`)
- Create: `Backend/battling/activePokemonControllers.js` (moved from `Controllers/activePokemonControllers.js`)
- Create: `Backend/battling/damageController.js` (moved from `Controllers/damageController.js`)
- Create: `Backend/battling/CalculationService.js` (moved from `infrastructure/calculation/CalculationService.js`)
- Modify: `Backend/Routes/activePokemonRoutes.js`, `Backend/Routes/miscRoutes.js` (or wherever damage routes are mounted), `Backend/server.js`
- Delete: `Backend/Controllers/activePokemonControllers.js`, `Backend/Controllers/damageController.js`, `Backend/infrastructure/calculation/CalculationService.js`

- [ ] **Step 1: Create `Backend/battling/changeActiveForm.js`**

Copy the `changeActiveForm` function verbatim from `Backend/Services/formService.js` (lines 65–110):

```javascript
const changeActiveForm = (existingPokemon, newFormName) => {
  if (existingPokemon.form === '')
    throw new Error(`${existingPokemon.name} doesn't have any other forms`);
  if (!existingPokemon.alternateForms[newFormName])
    throw new Error(
      `${existingPokemon.form} doesn't have another form by the name of ${newFormName}`,
    );

  const desiredForm = existingPokemon.alternateForms[newFormName];

  existingPokemon.alternateForms[existingPokemon.form] = {
    form: existingPokemon.form,
    ID: existingPokemon.ID,
    sprite: existingPokemon.sprite,
    baseStats: existingPokemon.baseStats,
    type1: existingPokemon.type1,
    type2: existingPokemon.type2,
    ability: existingPokemon.ability,
    abilities: existingPokemon.abilities,
    allMoves: existingPokemon.allMoves,
  };

  existingPokemon.form = desiredForm.form;
  existingPokemon.ID = desiredForm.ID;
  existingPokemon.sprite = desiredForm.sprite;
  existingPokemon.baseStats = desiredForm.baseStats;
  existingPokemon.type1 = desiredForm.type1;
  existingPokemon.type2 = desiredForm.type2;

  const abilityIndex =
    existingPokemon.abilities.findIndex((ability) => ability === existingPokemon.ability) || 0;
  if (abilityIndex < desiredForm.abilities.length) {
    existingPokemon.ability = desiredForm.abilities[abilityIndex];
  } else {
    existingPokemon.ability = desiredForm.abilities[0];
  }

  existingPokemon.abilities = desiredForm.abilities;

  return existingPokemon;
};

module.exports = changeActiveForm;
```

- [ ] **Step 2: Create `Backend/battling/activePokemonControllers.js`**

Copy `Backend/Controllers/activePokemonControllers.js` verbatim, but change the import line — the original imports `checkMega` alongside `changeActiveForm` even though `checkMega` is never used in this file (dead import, being dropped per the agreed dead-code cleanup):

Change:
```javascript
const { checkMega, changeActiveForm } = require('../Services/formService');
```
to:
```javascript
const changeActiveForm = require('./changeActiveForm');
```

Everything else in the file (`getOtherForms`, `changeForm`, `resetForm`, `module.exports`) is copied unchanged.

- [ ] **Step 3: Create `Backend/battling/damageController.js` and `Backend/battling/CalculationService.js`**

Copy both files verbatim to their new paths. Only their `require` line changes:

In `damageController.js`, change:
```javascript
const CalculationService = require('../infrastructure/calculation/CalculationService');
```
to:
```javascript
const CalculationService = require('./CalculationService');
```

In `CalculationService.js`, change:
```javascript
const { getModels } = require('../Config/jsonOptions');
```
to:
```javascript
const { getModels } = require('../game-data/loadModels');
```
Change:
```javascript
const {
  items: smogonItems,
  abilities: smogonAbilities,
} = require('../Config/tsOptions');
const calcDefenseType = require('../Domain/typeInteractions');
```
to:
```javascript
const {
  items: smogonItems,
  abilities: smogonAbilities,
} = require('../Config/tsOptions');
const calcDefenseType = require('../stats/typeInteractions');
```
(`stats/typeInteractions.js` is created in Task 14; if executing tasks in written order, this require will point at a file that doesn't exist yet until Task 14 lands — acceptable since the whole plan's tests are re-run at the end in Task 16, but note it if running Task 8 in isolation.)

- [ ] **Step 4: Update route files**

In `Backend/Routes/activePokemonRoutes.js`, change:
```javascript
const {
  getOtherForms,
  changeForm,
  resetForm,
} = require('../Controllers/activePokemonControllers');
```
to:
```javascript
const {
  getOtherForms,
  changeForm,
  resetForm,
} = require('../battling/activePokemonControllers');
```

Find the route file that mounts `damageController` (search `grep -rn "damageController" Backend/Routes Backend/interfaces` to confirm the exact file — it is mounted under `/misc/damage` per `server.js`) and update its require the same way, from `../Controllers/damageController` to `../battling/damageController`.

- [ ] **Step 5: Delete the superseded files**

```bash
git rm Backend/Controllers/activePokemonControllers.js Backend/Controllers/damageController.js \
  Backend/infrastructure/calculation/CalculationService.js
```

If Task 7's `git rm Backend/Services/formService.js` hasn't been committed yet, do it now as part of this same commit.

- [ ] **Step 6: Run the existing damage/form tests against the new paths**

The existing `__tests__/unit/activePokemonControllers.test.js`, `__tests__/unit/damage.test.js`, and `__tests__/integration/damageMatrix.test.js` / `radicalRedAbilityFixes.test.js` reference the old module paths. Update each test file's `require`/`jest.mock` paths from `Controllers/activePokemonControllers`, `Controllers/damageController`, `infrastructure/calculation/CalculationService` to their `battling/` equivalents. Move the test files themselves into `__tests__/unit/battling/` and `__tests__/integration/battling/` respectively for consistency with the new feature folders.

Run: `cd Backend && npx jest --testPathPatterns=__tests__/unit/battling`
Expected: PASS (same assertions as before, only paths changed)

- [ ] **Step 7: Commit**

```bash
git add Backend/battling Backend/Routes/activePokemonRoutes.js Backend/__tests__/unit/battling Backend/__tests__/integration/battling
git commit -m "refactor: relocate battling feature (forms, damage calc) into battling/"
```

---

### Task 9: Relocate `HydrationService`, rewrite `boxControllers.js`

`HydrationService.hydrate()` needs zero logic changes — its destructuring (`const { name, form, ... } = entity`) already works identically whether `entity` is a plain object or a `PokemonEntity` instance, since it reads through the class's getters. This task moves it, then rewrites the box controller to use `BoxRepository`/`BoxEntity`/`createFromImportText`, fixing the `updateInBox` bug from Assumption #1 (the missing `findMyBox` export) along the way.

**Files:**
- Create: `Backend/pokemon/HydrationService.js` (moved from `infrastructure/hydration/HydrationService.js`, no logic change)
- Create: `Backend/boxes/boxControllers.js` (rewritten from `Controllers/myBoxControllers.js`)
- Test: `Backend/__tests__/unit/boxes/boxControllers.test.js` (moved + adapted from `__tests__/unit/myBoxControllers.test.js`)
- Delete: `Backend/infrastructure/hydration/HydrationService.js`, `Backend/Controllers/myBoxControllers.js`, `Backend/__tests__/unit/myBoxControllers.test.js`

- [ ] **Step 1: Move `HydrationService`**

Copy `Backend/infrastructure/hydration/HydrationService.js` verbatim to `Backend/pokemon/HydrationService.js`. Update its internal requires (paths shift by one directory level less, since it's now inside `pokemon/` instead of `infrastructure/hydration/`):

Change:
```javascript
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
```
to:
```javascript
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
} = require('../Config/jsOptions');
const allAvaliableMoves = require('../legality/pokemonMovesets');
const legalMoves = require('../legality/legalMoves');
const legalAbility = require('../legality/legalAbilities');
const stats = require('../stats/statCalculator');
```

(`legality/` and `stats/` are created in Task 14 — same note as Task 8's `CalculationService.js`: this require will 404 until Task 14 lands if run in isolation. All paths resolve correctly by Task 16's final full-suite run.)

Function bodies (`load`, `getMove`, `getAbility`, `buildFormEntry`, `hydrate`) are unchanged.

- [ ] **Step 2: Write the failing tests for `boxControllers`**

```javascript
jest.mock('../../../boxes/BoxRepository');
jest.mock('../../../pokemon/createFromImportText');
jest.mock('../../../pokemon/HydrationService');
jest.mock('../../../infrastructure/logger/logger', () => ({ info: jest.fn(), warn: jest.fn() }));

const BoxRepository = require('../../../boxes/BoxRepository');
const BoxEntity = require('../../../boxes/BoxEntity');
const createFromImportText = require('../../../pokemon/createFromImportText');
const HydrationService = require('../../../pokemon/HydrationService');
const {
  getAllMyBoxes, findBox, addBox, addToBox, findInBox, deleteInBox, updateInBox, clearMyBox,
} = require('../../../boxes/boxControllers');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const fakeEntity = (name) => ({ name, toJSON: () => ({ name }) });

beforeEach(() => {
  jest.clearAllMocks();
  HydrationService.hydrate.mockImplementation((entity) => ({ hydrated: entity.name }));
});

describe('boxControllers.getAllMyBoxes', () => {
  test('returns all boxes hydrated', async () => {
    const box = new BoxEntity([]);
    box.addPokemon(fakeEntity('Ditto'));
    BoxRepository.loadAll.mockResolvedValue([box]);

    const req = { userId: 'user-1' };
    const res = mockRes();
    await getAllMyBoxes(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ allBoxes: [{ Ditto: { hydrated: 'Ditto' } }] }),
    );
  });
});

describe('boxControllers.findBox', () => {
  test('returns 400 for a non-numeric index', async () => {
    const res = mockRes();
    await findBox({ userId: 'user-1', params: { index: 'abc' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 404 when the box is not found', async () => {
    BoxRepository.loadOne.mockResolvedValue(undefined);
    const res = mockRes();
    await findBox({ userId: 'user-1', params: { index: '0' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('boxControllers.updateInBox (regression test for Assumption #1)', () => {
  test('successfully updates a Pokemon in the box instead of throwing findMyBox is not a function', async () => {
    const box = new BoxEntity([]);
    box.addPokemon(fakeEntity('Ditto'));
    BoxRepository.loadAll.mockResolvedValue([box]);
    createFromImportText.mockReturnValue(fakeEntity('Ditto'));

    const req = {
      userId: 'user-1',
      params: { index: '0', pokemonName: 'Ditto' },
      body: { pokemonData: 'Ditto\nLevel: 50' },
    };
    const res = mockRes();
    await updateInBox(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(BoxRepository.saveAll).toHaveBeenCalled();
  });

  test('returns 404 when the target Pokemon does not exist in the box', async () => {
    BoxRepository.loadAll.mockResolvedValue([new BoxEntity([])]);
    const req = {
      userId: 'user-1',
      params: { index: '0', pokemonName: 'Mew' },
      body: { pokemonData: 'Mew\nLevel: 50' },
    };
    const res = mockRes();
    await updateInBox(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd Backend && npx jest __tests__/unit/boxes/boxControllers.test.js`
Expected: FAIL — `Cannot find module '../../../boxes/boxControllers'`

- [ ] **Step 4: Implement `boxControllers.js`**

```javascript
const BoxRepository = require('./BoxRepository');
const BoxEntity = require('./BoxEntity');
const createFromImportText = require('../pokemon/createFromImportText');
const { checkMega, addMega } = require('../forms/checkMega');
const HydrationService = require('../pokemon/HydrationService');
const logger = require('../infrastructure/logger/logger');
const { USER_ACTION_EVENTS } = require('../infrastructure/logger/events');

const parseBoxIndex = (param) => {
  const index = Number(param);
  return Number.isInteger(index) && index >= 0 ? index : null;
};

const hydrateBox = (box) => {
  const result = {};
  box.listPokemon().forEach((entity) => {
    result[entity.name] = HydrationService.hydrate(entity);
  });
  return result;
};

const getAllMyBoxes = async (req, res) => {
  const { userId } = req;
  const boxes = await BoxRepository.loadAll(userId);
  res.status(200).json({ message: 'Successfully found my boxes', allBoxes: boxes.map(hydrateBox) });
};

const getBoxCount = async (req, res) => {
  const { userId } = req;
  const cached = await BoxRepository.getCachedCount(userId);
  if (cached !== null) return res.status(200).json({ count: cached });

  let boxes = await BoxRepository.loadAll(userId);
  if (boxes.length === 0) {
    boxes.push(new BoxEntity([]));
    await BoxRepository.saveAll(userId, boxes);
    logger.info(USER_ACTION_EVENTS.BOX_CREATED, { userId, newBoxIndex: 0, reason: 'auto_init' });
  }

  await BoxRepository.setCachedCount(userId, boxes.length);
  BoxRepository.preWarmCache(userId, boxes).catch(() => {});

  return res.status(200).json({ count: boxes.length });
};

const findBox = async (req, res) => {
  const { userId } = req;
  const index = parseBoxIndex(req.params.index);
  if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });
  const box = await BoxRepository.loadOne(userId, index);
  if (!box) return res.status(404).json({ message: `Box ${index} not found` });
  res.status(200).json({ message: 'Successfully found my box', box: hydrateBox(box) });
};

const addBox = async (req, res) => {
  const { userId } = req;
  const boxes = await BoxRepository.loadAll(userId);
  boxes.push(new BoxEntity([]));
  await BoxRepository.saveAll(userId, boxes);
  await BoxRepository.invalidateCachedCount(userId);
  logger.info(USER_ACTION_EVENTS.BOX_CREATED, { userId, newBoxIndex: boxes.length - 1 });
  return res.status(200).json({ message: 'a box was successfully added', count: boxes.length });
};

const removeBox = async (req, res) => {
  const { userId } = req;
  const index = parseBoxIndex(req.params.index);
  if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });

  const boxes = await BoxRepository.loadAll(userId);
  boxes.splice(index, 1);
  if (boxes.length === 0) {
    boxes.push(new BoxEntity([]));
    logger.info(USER_ACTION_EVENTS.BOX_CREATED, { userId, newBoxIndex: 0, reason: 'auto_restore' });
  }
  await BoxRepository.saveAll(userId, boxes);
  await BoxRepository.invalidateAll(userId);
  await BoxRepository.invalidateCachedCount(userId);

  const newActiveIndex = Math.min(index, boxes.length - 1);
  logger.info(USER_ACTION_EVENTS.BOX_REMOVED, { userId, removedIndex: index });
  return res.status(200).json({ message: 'removed the box', count: boxes.length, newActiveIndex });
};

const addToBox = async (req, res) => {
  try {
    const { userId } = req;
    const index = parseBoxIndex(req.params.index);
    if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });

    const { pokemonData } = req.body;
    const boxes = await BoxRepository.loadAll(userId);
    if (!boxes[index]) return res.status(404).json({ message: `Box ${index} not found` });
    const box = boxes[index];

    const newPokemons = pokemonData
      .trim()
      .split(/\n\s*\n/)
      .map((pokemonText) =>
        checkMega(pokemonText) ? addMega(pokemonText, 1) : createFromImportText(pokemonText, 1),
      );

    const duplicates = newPokemons.filter((entity) => box.hasPokemon(entity.name));
    const validPokemon = newPokemons.filter((entity) => !box.hasPokemon(entity.name));
    validPokemon.forEach((entity) => box.addPokemon(entity));

    boxes[index] = box;
    await BoxRepository.saveAll(userId, boxes);
    await BoxRepository.invalidateOne(userId, index);

    if (duplicates.length > 0) {
      logger.warn(USER_ACTION_EVENTS.POKEMON_IMPORTED, {
        userId, boxIndex: index,
        imported: validPokemon.map((p) => p.name),
        skippedDuplicates: duplicates.map((p) => p.name),
        partialSuccess: true,
      });
      return res.status(409).json({
        partialSuccess: `still added ${validPokemon.map((p) => p.name).join(', ')} to my box`,
        error: `${duplicates.map((p) => p.name).join(', ')} already exists in my box`,
        addedPokemon: validPokemon.map((entity) => HydrationService.hydrate(entity)),
        updatedBox: hydrateBox(box),
      });
    }

    logger.info(USER_ACTION_EVENTS.POKEMON_IMPORTED, {
      userId, boxIndex: index, imported: newPokemons.map((p) => p.name), count: newPokemons.length,
    });
    return res.status(201).json({
      message: `Successfully added ${newPokemons.map((p) => p.name)} to my box`,
      addedPokemon: validPokemon.map((entity) => HydrationService.hydrate(entity)),
      updatedBox: hydrateBox(box),
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      message: err.message || 'Failed to add pokemon, double check the imported text',
    });
  }
};

const findInBox = async (req, res) => {
  const { userId } = req;
  const index = parseBoxIndex(req.params.index);
  if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });
  const pokemonName = req.params.pokemonName;
  const boxes = await BoxRepository.loadAll(userId);
  if (!boxes[index]) return res.status(404).json({ message: `Box ${index} not found` });
  const entity = boxes[index].getPokemon(pokemonName);
  if (!entity) return res.status(404).json({ message: `${pokemonName} not found in my box` });
  res.status(200).json({ message: `Successfully found ${pokemonName}`, pokemon: HydrationService.hydrate(entity) });
};

const deleteInBox = async (req, res) => {
  const { userId } = req;
  const index = parseBoxIndex(req.params.index);
  if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });
  const pokemonName = req.params.pokemonName;
  const boxes = await BoxRepository.loadAll(userId);
  if (!boxes[index]) return res.status(404).json({ message: `Box ${index} not found` });
  const box = boxes[index];

  if (!box.hasPokemon(pokemonName)) return res.status(404).json({ message: `${pokemonName} not found in my box` });

  const removed = box.removePokemon(pokemonName);
  boxes[index] = box;
  await BoxRepository.saveAll(userId, boxes);
  await BoxRepository.invalidateOne(userId, index);

  logger.info(USER_ACTION_EVENTS.POKEMON_DELETED, { userId, boxIndex: index, pokemonName });
  return res.status(200).json({
    message: `${pokemonName} successfully deleted from my box`,
    deletedPokemon: HydrationService.hydrate(removed),
    updatedBox: hydrateBox(box),
  });
};

const updateInBox = async (req, res) => {
  try {
    const { userId } = req;
    const index = parseBoxIndex(req.params.index);
    if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });

    const pokemonName = req.params.pokemonName;
    const { pokemonData } = req.body;
    const boxes = await BoxRepository.loadAll(userId);
    if (!boxes[index]) return res.status(404).json({ message: `Box ${index} not found` });
    const box = boxes[index];

    if (!box.hasPokemon(pokemonName))
      return res.status(404).json({ message: `${pokemonName} doesn't exists in my box` });

    const updatedEntity = createFromImportText(pokemonData, 1);
    box.updatePokemon(pokemonName, updatedEntity);
    boxes[index] = box;
    await BoxRepository.saveAll(userId, boxes);
    await BoxRepository.invalidateOne(userId, index);

    logger.info(USER_ACTION_EVENTS.POKEMON_UPDATED, { userId, boxIndex: index, pokemonName: updatedEntity.name });
    res.status(200).json({
      message: `${updatedEntity.name} was successfully updated in my box`,
      theUpdatedPokemon: HydrationService.hydrate(updatedEntity),
      allBoxes: (await BoxRepository.loadAll(userId)).map(hydrateBox),
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message || `failed to update pokemon in box` });
  }
};

const clearMyBox = async (req, res) => {
  const { userId } = req;
  const index = parseBoxIndex(req.params.index);
  if (index === null) return res.status(400).json({ message: `Invalid box index: "${req.params.index}"` });
  const boxes = await BoxRepository.loadAll(userId);
  if (!boxes[index]) return res.status(404).json({ message: `Box ${index} not found` });
  boxes[index].clear();
  await BoxRepository.saveAll(userId, boxes);
  await BoxRepository.invalidateOne(userId, index);

  logger.info(USER_ACTION_EVENTS.BOX_CLEARED, { userId, boxIndex: index });
  res.status(200).json({ message: `my box was successfully cleared`, updatedBox: hydrateBox(boxes[index]) });
};

const clearMyBoxes = async (req, res) => {
  const { userId } = req;
  await BoxRepository.saveAll(userId, []);
  logger.info(USER_ACTION_EVENTS.BOX_CLEARED_ALL, { userId });
  return res.status(200).json({
    message: `All my boxes have been successfully cleared`,
    allBoxes: (await BoxRepository.loadAll(userId)).map(hydrateBox),
  });
};

module.exports = {
  getAllMyBoxes, getBoxCount, findBox, addBox, removeBox,
  addToBox, findInBox, deleteInBox, updateInBox, clearMyBox, clearMyBoxes,
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd Backend && npx jest __tests__/unit/boxes/boxControllers.test.js`
Expected: PASS, including the Assumption #1 regression test

- [ ] **Step 6: Update `Backend/Routes/myBoxRoutes.js`**

Change:
```javascript
const { ... } = require('../Controllers/myBoxControllers');
```
to:
```javascript
const { ... } = require('../boxes/boxControllers');
```

- [ ] **Step 7: Delete the superseded files**

```bash
git rm Backend/infrastructure/hydration/HydrationService.js Backend/Controllers/myBoxControllers.js \
  Backend/__tests__/unit/myBoxControllers.test.js
```

- [ ] **Step 8: Commit**

```bash
git add Backend/pokemon/HydrationService.js Backend/boxes/boxControllers.js \
  Backend/__tests__/unit/boxes/boxControllers.test.js Backend/Routes/myBoxRoutes.js
git commit -m "fix: rewrite box controllers onto BoxRepository, fix updateInBox 500 bug"
```

---

### Task 10: `teamControllers.js` + `pokemonInTeamControllers.js` rewrite

Rewrites `Controllers/teamControllers.js` and `Controllers/pokemonControllers.js` onto `TeamRepository`/`TeamEntity`. Per the design's decision #7, `pokemonInTeamControllers.js`'s add/update paths now go through `TeamRepository.savePokemon` (version-checked) instead of blind overwrites — this is the one endpoint pair where behavior visibly changes (can now 409 on concurrent edits, matching the design doc's flagged trade-off).

**Files:**
- Create: `Backend/teams/teamControllers.js` (from `Controllers/teamControllers.js`)
- Create: `Backend/teams/pokemonInTeamControllers.js` (from `Controllers/pokemonControllers.js`)
- Test: `Backend/__tests__/unit/teams/teamControllers.test.js`, `Backend/__tests__/unit/teams/pokemonInTeamControllers.test.js`
- Delete: `Backend/Controllers/teamControllers.js`, `Backend/Controllers/pokemonControllers.js`, `Backend/__tests__/unit/teamControllers.test.js`, `Backend/__tests__/unit/pokemonControllers.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
// Backend/__tests__/unit/teams/teamControllers.test.js
jest.mock('../../../teams/TeamRepository');
jest.mock('../../../infrastructure/logger/logger', () => ({ info: jest.fn() }));

const TeamRepository = require('../../../teams/TeamRepository');
const TeamEntity = require('../../../teams/TeamEntity');
const { getTeam, addTeam, removeTeam, saveFullTeam } = require('../../../teams/teamControllers');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe('teamControllers.getTeam', () => {
  test('returns 400 for an invalid player', async () => {
    const res = mockRes();
    await getTeam({ userId: 'u1', params: { player: '9', teamName: 'Main' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns the team with trainerInfo separated out', async () => {
    const team = new TeamEntity([], { name: 'Blue' });
    TeamRepository.findTeam.mockResolvedValue(team);
    const res = mockRes();
    await getTeam({ userId: 'u1', params: { player: '1', teamName: 'Main' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('teamControllers.addTeam', () => {
  test('returns 400 when the team already exists', async () => {
    const error = new Error('Main already exists in my box');
    error.code = 'DUPLICATE_TEAM';
    TeamRepository.addTeam.mockRejectedValue(error);
    const res = mockRes();
    await addTeam({ userId: 'u1', params: { player: '1' }, body: { teamName: 'Main' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('teamControllers.saveFullTeam (Assumption #3 — raw bench array preserved)', () => {
  test('passes the bench array straight through to replaceTeamContents', async () => {
    TeamRepository.replaceTeamContents.mockResolvedValue(undefined);
    TeamRepository.loadAllTeams.mockResolvedValue({});
    const bench = [{ name: 'Ditto' }];
    const res = mockRes();
    await saveFullTeam(
      { userId: 'u1', params: { player: '1', teamName: 'Main' }, body: { bench } },
      res,
    );
    expect(TeamRepository.replaceTeamContents).toHaveBeenCalledWith(1, 'u1', 'Main', bench);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 400 when bench is not an array', async () => {
    const res = mockRes();
    await saveFullTeam(
      { userId: 'u1', params: { player: '1', teamName: 'Main' }, body: { bench: 'not-an-array' } },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
```

```javascript
// Backend/__tests__/unit/teams/pokemonInTeamControllers.test.js
jest.mock('../../../teams/TeamRepository');
jest.mock('../../../pokemon/createFromImportText');
jest.mock('../../../forms/checkMega');

const TeamRepository = require('../../../teams/TeamRepository');
const TeamEntity = require('../../../teams/TeamEntity');
const createFromImportText = require('../../../pokemon/createFromImportText');
const { checkMega } = require('../../../forms/checkMega');
const { addPokemon, updatePokemon } = require('../../../teams/pokemonInTeamControllers');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe('pokemonInTeamControllers.addPokemon (now version-checked per design decision #7)', () => {
  test('routes each imported Pokemon through TeamRepository.savePokemon', async () => {
    checkMega.mockReturnValue(false);
    const entity = { name: 'Ditto', player: 1, version: 0 };
    createFromImportText.mockReturnValue(entity);
    TeamRepository.savePokemon.mockResolvedValue({ ...entity, version: 1 });
    TeamRepository.findTeam.mockResolvedValue(new TeamEntity([]));

    const req = {
      userId: 'u1',
      params: { player: '1', teamName: 'Main' },
      body: { pokemonData: 'Ditto\nLevel: 50' },
    };
    const res = mockRes();
    await addPokemon(req, res);

    expect(TeamRepository.savePokemon).toHaveBeenCalledWith(entity, 'Main', 'Ditto', 'u1');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('returns 409 when TeamRepository.savePokemon reports a version conflict', async () => {
    checkMega.mockReturnValue(false);
    createFromImportText.mockReturnValue({ name: 'Ditto', player: 1, version: 0 });
    TeamRepository.findTeam.mockResolvedValue(new TeamEntity([]));
    const conflict = new Error('Conflict: Ditto was modified after this draft was opened');
    conflict.status = 409;
    TeamRepository.savePokemon.mockRejectedValue(conflict);

    const req = {
      userId: 'u1',
      params: { player: '1', teamName: 'Main' },
      body: { pokemonData: 'Ditto\nLevel: 50' },
    };
    const res = mockRes();
    await addPokemon(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Backend && npx jest __tests__/unit/teams`
Expected: FAIL — modules don't exist yet

- [ ] **Step 3: Implement `teamControllers.js`**

```javascript
const TeamRepository = require('./TeamRepository');
const logger = require('../infrastructure/logger/logger');
const { USER_ACTION_EVENTS } = require('../infrastructure/logger/events');

const hydrateTeamsMap = (teams) => {
  const result = {};
  for (const [name, team] of Object.entries(teams)) {
    result[name] = Array.isArray(team) ? team : team.toJSON();
  }
  return result;
};

const getTeam = async (req, res) => {
  try {
    const { userId } = req;
    const player = Number(req.params.player);
    if (player !== 1 && player !== 2)
      return res.status(400).json({ message: `player variable must be a 1 or 2 not ${player}` });

    const teamName = req.params.teamName;
    const team = await TeamRepository.findTeam(player, teamName, userId);
    if (Array.isArray(team)) {
      return res.status(200).json({ teamName, trainerInfo: 'undefined', team });
    }
    const trainerInfo = team.trainerInfo;
    const pokemonMap = {};
    team.listPokemon().forEach((entity) => { pokemonMap[entity.name] = entity.toJSON(); });

    return res.status(200).json({ teamName: `${teamName}`, trainerInfo: `${trainerInfo}`, team: pokemonMap });
  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
};

const getAllTeams = async (req, res) => {
  try {
    const { userId } = req;
    const player = Number(req.params.player);
    if (player !== 1 && player !== 2)
      return res.status(400).json({ message: `player variable must be a 1 or 2 not ${player}` });

    const teams = await TeamRepository.loadAllTeams(player, userId);
    return res.status(200).json({ allTeams: hydrateTeamsMap(teams) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const addTeam = async (req, res) => {
  try {
    const { userId } = req;
    const player = Number(req.params.player);
    if (player !== 1 && player !== 2)
      return res.status(400).json({ message: `player variable must be a 1 or 2 not ${player}` });

    const teamName = req.body.teamName;
    const teams = await TeamRepository.addTeam(player, userId, teamName);

    logger.info(USER_ACTION_EVENTS.TEAM_CREATED, { userId, teamName, player });
    return res.status(200).json({
      message: `Created ${teamName} in ${player === 1 ? 'my box' : ' the enemy box'}`,
      teamName,
      currentBox: hydrateTeamsMap(teams),
    });
  } catch (err) {
    if (err.code === 'DUPLICATE_TEAM') return res.status(400).json({ message: err.message });
    return res.status(500).json({ message: err.message });
  }
};

const removeTeam = async (req, res) => {
  try {
    const { userId } = req;
    const player = Number(req.params.player);
    if (player !== 1 && player !== 2)
      return res.status(400).json({ message: `player variable must be a 1 or 2 not ${player}` });

    const teamName = req.params.teamName;
    const teams = await TeamRepository.removeTeam(player, userId, teamName);

    logger.info(USER_ACTION_EVENTS.TEAM_DELETED, { userId, teamName, player });
    return res.status(200).json({
      message: `Successfully deleted ${teamName} in ${player === 1 ? 'my box' : ' the enemy box'}`,
      teamName,
      currentBox: hydrateTeamsMap(teams),
    });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ message: err.message });
    return res.status(500).json({ message: err.message });
  }
};

const removeAllTeams = async (req, res) => {
  try {
    const { userId } = req;
    const player = Number(req.params.player);
    if (player !== 1 && player !== 2)
      return res.status(400).json({ message: `player variable must be a 1 or 2 not ${player}` });
    await TeamRepository.removeAllTeams(player, userId);

    logger.info(USER_ACTION_EVENTS.TEAM_CLEARED_ALL, { userId, player });
    return res.status(200).json({
      message: `${player === 1 ? 'All my teams' : 'All the enemy teams'} have been cleared`,
      currentBox: hydrateTeamsMap(await TeamRepository.loadAllTeams(player, userId)),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const saveFullTeam = async (req, res) => {
  try {
    const { userId } = req;
    const player = Number(req.params.player);
    if (player !== 1 && player !== 2)
      return res.status(400).json({ message: `player variable must be a 1 or 2 not ${player}` });

    const teamName = req.params.teamName;
    const { bench } = req.body;
    if (!Array.isArray(bench)) return res.status(400).json({ message: 'bench must be an array' });

    await TeamRepository.replaceTeamContents(player, userId, teamName, bench);

    logger.info(USER_ACTION_EVENTS.TEAM_SAVED, { userId, teamName, player, pokemonCount: bench.length });
    return res.status(200).json({
      message: `Saved team ${teamName}`,
      currentBox: hydrateTeamsMap(await TeamRepository.loadAllTeams(player, userId)),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { getTeam, getAllTeams, addTeam, removeTeam, removeAllTeams, saveFullTeam };
```

- [ ] **Step 4: Implement `pokemonInTeamControllers.js`**

```javascript
const TeamRepository = require('./TeamRepository');
const createFromImportText = require('../pokemon/createFromImportText');
const { checkMega, addMega } = require('../forms/checkMega');

const validatePlayer = (player, res) => {
  if (player !== 1 && player !== 2) {
    res.status(400).json({ message: `player variable must be a 1 or 2 not ${player}` });
    return false;
  }
  return true;
};

const addPokemon = async (req, res) => {
  try {
    const { userId } = req;
    const player = Number(req.params.player);
    if (!validatePlayer(player, res)) return;

    const teamName = req.params.teamName;
    const { pokemonData } = req.body;

    const newEntities = pokemonData
      .trim()
      .split(/\n\s*\n/)
      .map((pokemonText) =>
        checkMega(pokemonText) ? addMega(pokemonText, player) : createFromImportText(pokemonText, player),
      );

    const team = await TeamRepository.findTeam(player, teamName, userId);
    const duplicates = !Array.isArray(team) ? newEntities.filter((e) => team.hasPokemon(e.name)) : [];
    const toSave = !Array.isArray(team) ? newEntities.filter((e) => !team.hasPokemon(e.name)) : newEntities;

    const saved = [];
    for (const entity of toSave) {
      saved.push(await TeamRepository.savePokemon(entity, teamName, entity.name, userId));
    }

    const updated = await TeamRepository.findTeam(player, teamName, userId);

    if (player === 1 && duplicates.length > 0) {
      return res.status(409).json({
        partialSuccess: `still added ${saved.map((p) => p.name).join(', ')} to ${teamName} in my box`,
        error: `${duplicates.map((p) => p.name).join(', ')} already exists in ${teamName}`,
        updatedTeam: updated.toJSON(),
      });
    }

    return res.status(201).json({
      message: `Successfully added ${newEntities.map((p) => p.name)} to ${player === 1 ? `${teamName} my box` : `${teamName} enemy box`}`,
      addedPokemon: saved.map((entity) => entity.toJSON()),
      updatedTeam: updated.toJSON(),
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      message: err.message || 'Failed to add pokemon, double check the imported text',
    });
  }
};

const findPokemon = async (req, res) => {
  const { userId } = req;
  const player = Number(req.params.player);
  if (!validatePlayer(player, res)) return;

  const teamName = req.params.teamName;
  const pokemonName = req.params.pokemonName;
  const team = await TeamRepository.findTeam(player, teamName, userId);
  const entity = !Array.isArray(team) ? team.getPokemon(pokemonName) : null;

  if (!entity)
    return res.status(404).json({
      message: `${pokemonName} not found in ${teamName} in ${player === 1 ? 'my boxes' : 'enemy boxes'}`,
    });

  res.status(200).json({ message: `Successfully found ${pokemonName}`, pokemon: entity.toJSON() });
};

const deletePokemon = async (req, res) => {
  const { userId } = req;
  const player = Number(req.params.player);
  if (!validatePlayer(player, res)) return;

  const teamName = req.params.teamName;
  const pokemonName = req.params.pokemonName;
  const teams = await TeamRepository.loadAllTeams(player, userId);
  const team = teams[teamName];

  if (Array.isArray(team) || !team || !team.hasPokemon(pokemonName))
    return res.status(404).json({
      message: `${pokemonName} not found in ${teamName} in ${player === 1 ? 'my box' : 'the enemy box'}`,
    });

  const removed = team.removePokemon(pokemonName);
  await TeamRepository.saveAllTeams(player, userId, teams);

  return res.status(200).json({
    message: `${pokemonName} successfully deleted from ${teamName} in ${player === 1 ? 'my box' : 'the enemy box'}`,
    deletedPokemon: removed.toJSON(),
    updatedBox: Object.keys(await TeamRepository.loadAllTeams(player, userId)),
  });
};

const updatePokemon = async (req, res) => {
  try {
    const { userId } = req;
    const player = Number(req.params.player);
    if (!validatePlayer(player, res)) return;

    const teamName = req.params.teamName;
    const pokemonName = req.params.pokemonName;
    const { pokemonData } = req.body;
    const team = await TeamRepository.findTeam(player, teamName, userId);

    if (Array.isArray(team) || !team.hasPokemon(pokemonName))
      return res.status(404).json({
        message: `${pokemonName} doesn't exists in ${teamName} in ${player === 1 ? 'my box' : 'the enemy box'}`,
      });

    const updatedEntity = createFromImportText(pokemonData, player);
    const saved = await TeamRepository.savePokemon(updatedEntity, teamName, pokemonName, userId);

    res.status(200).json({
      message: `${saved.name} was successfully updated in ${teamName} in ${player === 1 ? 'my box' : 'the enemy box'}`,
      theUpdatedPokemon: saved.toJSON(),
      updatedBox: Object.keys(await TeamRepository.loadAllTeams(player, userId)),
    });
  } catch (err) {
    res.status(err.statusCode || err.status || 500).json({
      message: err.message || `failed to update pokemon in ${req.params.teamName}`,
    });
  }
};

const clearAllPokemon = async (req, res) => {
  const { userId } = req;
  const player = Number(req.params.player);
  if (!validatePlayer(player, res)) return;

  const teamName = req.params.teamName;
  const teams = await TeamRepository.loadAllTeams(player, userId);
  await TeamRepository.findTeam(player, teamName, userId);

  teams[teamName] = { toJSON: () => ({}) };
  await TeamRepository.saveAllTeams(player, userId, teams);

  res.status(200).json({
    message: `${teamName} in ${player === 1 ? 'my box' : 'the enemy box'} was successfully cleared`,
    updatedBox: await TeamRepository.loadAllTeams(player, userId),
  });
};

module.exports = { addPokemon, findPokemon, deletePokemon, updatePokemon, clearAllPokemon };
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd Backend && npx jest __tests__/unit/teams`
Expected: PASS

- [ ] **Step 6: Update route files**

In `Backend/Routes/teamRoutes.js`, change the require from `../Controllers/teamControllers` to `../teams/teamControllers`. In `Backend/Routes/pokemonRoutes.js`, change the require from `../Controllers/pokemonControllers.js` to `../teams/pokemonInTeamControllers`.

- [ ] **Step 7: Delete the superseded files**

```bash
git rm Backend/Controllers/teamControllers.js Backend/Controllers/pokemonControllers.js \
  Backend/__tests__/unit/teamControllers.test.js Backend/__tests__/unit/pokemonControllers.test.js
```

- [ ] **Step 8: Commit**

```bash
git add Backend/teams Backend/Routes/teamRoutes.js Backend/Routes/pokemonRoutes.js
git commit -m "fix: rewrite team controllers onto TeamRepository with version-checked writes"
```

---

### Task 11: Editor feature relocation — `SessionService`, `SessionStore`, `PokemonSessionController`

`SessionService`'s `resolveLegacyNatureName`/`resolveLegacyItemName` helpers are deleted here — that normalization now lives in `PokemonEntity.fromStoredDoc` (Task 1), reached transitively through `TeamRepository.findTeam` (Task 6). `patchDraft` now calls `entity.applyPatch()` instead of rebuilding via `PokemonEntity.create({ ...current, ...allowedChanges })`. `SessionStore` itself is **not** changed to use Redis in this pass — that's Phase-1 NestJS work per the paused migration design; it's still an in-process `Map`, just relocated.

**Files:**
- Create: `Backend/editor/SessionService.js` (from `Domain/session/SessionService.js`)
- Create: `Backend/editor/SessionStore.js` (from `infrastructure/session/SessionStore.js`, unchanged)
- Create: `Backend/editor/PokemonSessionController.js` (from `interfaces/controllers/PokemonSessionController.js`)
- Test: `Backend/__tests__/unit/editor/SessionService.test.js`
- Delete: `Backend/Domain/session/SessionService.js`, `Backend/infrastructure/session/SessionStore.js`, `Backend/interfaces/controllers/PokemonSessionController.js`, `Backend/__tests__/unit/SessionStore.test.js` (superseded by the relocated test below)

- [ ] **Step 1: Move `SessionStore.js` verbatim**

Copy `Backend/infrastructure/session/SessionStore.js` to `Backend/editor/SessionStore.js` with no changes — it has no dependencies on anything being relocated.

- [ ] **Step 2: Move the existing `SessionStore` test verbatim**

Copy `Backend/__tests__/unit/SessionStore.test.js` to `Backend/__tests__/unit/editor/SessionStore.test.js`, updating only its require path from `../../infrastructure/session/SessionStore` to `../../../editor/SessionStore`.

Run: `cd Backend && npx jest __tests__/unit/editor/SessionStore.test.js`
Expected: PASS (behavior unchanged)

- [ ] **Step 3: Write the failing tests for the rewritten `SessionService`**

```javascript
jest.mock('../../../editor/SessionStore');
jest.mock('../../../teams/TeamRepository');

const SessionStore = require('../../../editor/SessionStore');
const TeamRepository = require('../../../teams/TeamRepository');
const TeamEntity = require('../../../teams/TeamEntity');
const PokemonEntity = require('../../../pokemon/PokemonEntity');
const SessionService = require('../../../editor/SessionService');

const makePokemon = (overrides = {}) =>
  PokemonEntity.create({
    name: 'Ditto', form: 'Ditto', gender: 'N', level: 50, nature: 'Hardy', item: '',
    ability_id: 'Limber', move_ids: [],
    EVs: { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
    IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
    player: 1,
    ...overrides,
  });

beforeEach(() => jest.clearAllMocks());

describe('SessionService.activate', () => {
  test('loads the stored Pokemon from the team and stores it as the draft', async () => {
    const team = new TeamEntity([makePokemon()]);
    TeamRepository.findTeam.mockResolvedValue(team);

    await SessionService.activate('user-1', 'session-1', {
      player: 1, teamName: 'Main', pokemonName: 'Ditto',
    });

    expect(SessionStore.set).toHaveBeenCalledWith('user-1', 'session-1', expect.any(PokemonEntity));
  });

  test('throws when the Pokemon is not in the team', async () => {
    TeamRepository.findTeam.mockResolvedValue(new TeamEntity([]));
    await expect(
      SessionService.activate('user-1', 'session-1', { player: 1, teamName: 'Main', pokemonName: 'Missingno' }),
    ).rejects.toThrow('Missingno not found in team "Main"');
  });
});

describe('SessionService.patchDraft', () => {
  test('applies whitelisted changes onto the draft in place', () => {
    const entity = makePokemon();
    SessionStore.has.mockReturnValue(true);
    SessionStore.get.mockReturnValue(entity);

    SessionService.patchDraft('user-1', 'session-1', { level: 75 });

    expect(entity.level).toBe(75);
    expect(SessionStore.set).toHaveBeenCalledWith('user-1', 'session-1', entity);
  });

  test('throws when there is no active draft', () => {
    SessionStore.has.mockReturnValue(false);
    expect(() => SessionService.patchDraft('user-1', 'session-1', { level: 75 })).toThrow(
      'No active draft for session "session-1"',
    );
  });
});

describe('SessionService.removeDraft', () => {
  test('delegates to SessionStore.remove', () => {
    SessionService.removeDraft('user-1', 'session-1');
    expect(SessionStore.remove).toHaveBeenCalledWith('user-1', 'session-1');
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd Backend && npx jest __tests__/unit/editor/SessionService.test.js`
Expected: FAIL — `Cannot find module '../../../editor/SessionService'`

- [ ] **Step 5: Implement `SessionService.js`**

```javascript
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
```

Note: `PokemonEntity` is imported but not directly referenced in this file's logic anymore (`current.applyPatch` handles mutation) — remove the unused import if the linter flags it; it's kept above only because `patchDraft`'s error-message behavior was previously coupled to `PokemonEntity.create`'s validation errors, which now surface identically through `applyPatch`'s own validation.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd Backend && npx jest __tests__/unit/editor/SessionService.test.js`
Expected: PASS

- [ ] **Step 7: Move `PokemonSessionController.js`**

Copy `Backend/interfaces/controllers/PokemonSessionController.js` to `Backend/editor/PokemonSessionController.js`. Update its requires:

Change:
```javascript
const SessionService = require('../../Domain/session/SessionService');
const CalculationDomainService = require('../../Domain/pokemon/CalculationDomainService');
const TeamRepository = require('../../infrastructure/repositories/TeamRepository');
```
to:
```javascript
const SessionService = require('./SessionService');
const CalculationDomainService = require('../legality/validate');
const TeamRepository = require('../teams/TeamRepository');
```

Update the `saveDraft` call site — `TeamRepository.savePokemon` still takes `(entity, teamName, pokemonName, userId)`, unchanged from Task 6's implementation, so no call-site change is needed beyond the require path. `CalculationDomainService.validate` is renamed to just `validate` inside `Backend/legality/validate.js` (Task 14) but re-exported as `CalculationDomainService` locally via the import alias above, so the call site (`CalculationDomainService.validate(entity)`) needs updating to just `validate(entity)`:

Change:
```javascript
const { valid, errors } = CalculationDomainService.validate(entity);
```
to:
```javascript
const { valid, errors } = validate(entity);
```
and change the import to:
```javascript
const validate = require('../legality/validate');
```

- [ ] **Step 8: Update `Backend/interfaces/routes/pokemonSessionRoutes.js`**

Change:
```javascript
const {
  activate,
  patchDraft,
  saveDraft,
} = require('../controllers/PokemonSessionController');
```
to:
```javascript
const {
  activate,
  patchDraft,
  saveDraft,
} = require('../../editor/PokemonSessionController');
```

- [ ] **Step 9: Delete the superseded files**

```bash
git rm Backend/Domain/session/SessionService.js Backend/infrastructure/session/SessionStore.js \
  Backend/interfaces/controllers/PokemonSessionController.js Backend/__tests__/unit/SessionStore.test.js
```

- [ ] **Step 10: Commit**

```bash
git add Backend/editor Backend/interfaces/routes/pokemonSessionRoutes.js
git commit -m "refactor: relocate draft editor feature, simplify onto PokemonEntity.applyPatch"
```

---

### Task 12: Enemy-preview feature relocation

Pure relocation onto the new `TeamRepository`. `enemyPreviewService.js` currently calls `loadTeams(2, null)` directly from `jsonOptions.js`; that becomes `TeamRepository.loadAllTeams(2, null)`. Its own Redis caching (a separate concern from `TeamRepository`'s internal caching — this one caches the *derived, resolved-for-display* view) is unchanged.

**Files:**
- Create: `Backend/enemy-preview/enemyPreviewService.js`
- Create: `Backend/enemy-preview/publicControllers.js`
- Test: `Backend/__tests__/unit/enemy-preview/enemyPreviewService.test.js` (moved + adapted)
- Delete: `Backend/Services/enemyPreviewService.js`, `Backend/Controllers/publicControllers.js`, `Backend/__tests__/unit/enemyPreviewService.test.js`, `Backend/__tests__/unit/publicControllers.test.js`, `Backend/__tests__/integration/enemyPreviewIntegration.test.js` (moved, not deleted outright — see Step 3)

- [ ] **Step 1: Create `Backend/enemy-preview/enemyPreviewService.js`**

Copy `Backend/Services/enemyPreviewService.js` verbatim, changing only:
```javascript
const redis = require('../infrastructure/redis/redisClient');
const { loadTeams, getModels } = require('../Config/jsonOptions');
```
to:
```javascript
const redis = require('../infrastructure/redis/redisClient');
const TeamRepository = require('../teams/TeamRepository');
const { getModels } = require('../game-data/loadModels');
```
and inside `buildEnemyPreview`, change:
```javascript
const allTeams = await loadTeams(2, null);
```
to:
```javascript
const allTeams = await TeamRepository.loadAllTeams(2, null);
```

One shape adjustment is required here: `TeamRepository.loadAllTeams` returns `TeamEntity` instances (or raw arrays, per Assumption #3), not plain dicts, so `resolveTeamSlots(allTeams[teamName], getModels())` needs the team converted to its plain shape first. Change:
```javascript
const teamName = teamNames[0];
const team = resolveTeamSlots(allTeams[teamName], getModels());
```
to:
```javascript
const teamName = teamNames[0];
const rawTeam = allTeams[teamName];
const plainTeam = Array.isArray(rawTeam) ? rawTeam : rawTeam.toJSON();
const team = resolveTeamSlots(plainTeam, getModels());
```

Everything else (`normalizeMoveKey`, `resolveMoveList`, `resolveForm`, `resolvePokemon`, `resolveTeamSlots`, `getHydratedEnemyPreview`, `invalidateEnemyPreview`, the Redis cache key/TTL) is unchanged.

- [ ] **Step 2: Create `Backend/enemy-preview/publicControllers.js`**

Copy `Backend/Controllers/publicControllers.js` verbatim, changing only:
```javascript
const { getHydratedEnemyPreview } = require('../Services/enemyPreviewService');
```
to:
```javascript
const { getHydratedEnemyPreview } = require('./enemyPreviewService');
```

- [ ] **Step 3: Move the existing tests**

Copy `Backend/__tests__/unit/enemyPreviewService.test.js` to `Backend/__tests__/unit/enemy-preview/enemyPreviewService.test.js`, `Backend/__tests__/unit/publicControllers.test.js` to `Backend/__tests__/unit/enemy-preview/publicControllers.test.js`, and `Backend/__tests__/integration/enemyPreviewIntegration.test.js` to `Backend/__tests__/integration/enemy-preview/enemyPreviewIntegration.test.js`. Update each file's require/mock paths to point at the new `enemy-preview/` and `teams/TeamRepository` locations, replacing any `jest.mock('../../Config/jsonOptions')` with `jest.mock('../../../teams/TeamRepository')` and updating the mocked `loadTeams` calls to `loadAllTeams`.

Run: `cd Backend && npx jest __tests__/unit/enemy-preview __tests__/integration/enemy-preview`
Expected: PASS

- [ ] **Step 4: Update `Backend/Routes/publicRoutes.js`**

Change the require from `../Controllers/publicControllers` to `../enemy-preview/publicControllers`.

- [ ] **Step 5: Delete the superseded files**

```bash
git rm Backend/Services/enemyPreviewService.js Backend/Controllers/publicControllers.js \
  Backend/__tests__/unit/enemyPreviewService.test.js Backend/__tests__/unit/publicControllers.test.js \
  Backend/__tests__/integration/enemyPreviewIntegration.test.js
```

- [ ] **Step 6: Commit**

```bash
git add Backend/enemy-preview Backend/Routes/publicRoutes.js \
  Backend/__tests__/unit/enemy-preview Backend/__tests__/integration/enemy-preview
git commit -m "refactor: relocate enemy-preview feature onto TeamRepository"
```

---

### Task 13: Identity feature relocation + `AuthController.migrate` repository fix

`jwtCheck.js`, `resolveIdentity.js`, and `GuestController.js` are pure relocations, no logic changes. `AuthController.migrate` changes from calling `db.collection(...).updateMany()` directly to calling `BoxRepository.reassignOwner`/`TeamRepository.reassignOwner` — this closes the last direct-DB-access path outside the two repositories, per design decision #2 (Task 5/6 already added `reassignOwner` to both repositories for exactly this call site).

**Files:**
- Create: `Backend/identity/jwtCheck.js`, `Backend/identity/resolveIdentity.js`, `Backend/identity/GuestController.js` (unchanged, relocated)
- Create: `Backend/identity/AuthController.js` (rewritten `migrate`)
- Test: `Backend/__tests__/unit/identity/AuthController.test.js`
- Delete: `Backend/infrastructure/auth/jwtCheck.js`, `Backend/infrastructure/auth/resolveIdentity.js`, `Backend/interfaces/controllers/AuthController.js`, `Backend/interfaces/controllers/GuestController.js`, `Backend/__tests__/unit/jwtCheck.test.js`, `Backend/__tests__/unit/resolveIdentity.test.js`, `Backend/__tests__/integration/jwtValidation.test.js`

- [ ] **Step 1: Move `jwtCheck.js`, `resolveIdentity.js`, `GuestController.js` verbatim**

Copy `Backend/infrastructure/auth/jwtCheck.js` to `Backend/identity/jwtCheck.js` — its only require, `../logger/logger` and `../logger/events`, becomes `../infrastructure/logger/logger` and `../infrastructure/logger/events` (one directory level shallower now).

Copy `Backend/infrastructure/auth/resolveIdentity.js` to `Backend/identity/resolveIdentity.js` — change `require('./jwtCheck')` (unchanged, same directory) and `require('../logger/logger')`/`require('../logger/events')` to `require('../infrastructure/logger/logger')`/`require('../infrastructure/logger/events')`.

Copy `Backend/interfaces/controllers/GuestController.js` to `Backend/identity/GuestController.js` — change `require('../../infrastructure/logger/logger')` and `require('../../infrastructure/logger/events')` to `require('../infrastructure/logger/logger')` and `require('../infrastructure/logger/events')`.

- [ ] **Step 2: Move the existing `jwtCheck`/`resolveIdentity` tests verbatim**

Copy `Backend/__tests__/unit/jwtCheck.test.js` to `Backend/__tests__/unit/identity/jwtCheck.test.js` and `Backend/__tests__/unit/resolveIdentity.test.js` to `Backend/__tests__/unit/identity/resolveIdentity.test.js`, and `Backend/__tests__/integration/jwtValidation.test.js` to `Backend/__tests__/integration/identity/jwtValidation.test.js`, updating only their require paths to the new `identity/` location.

Run: `cd Backend && npx jest __tests__/unit/identity/jwtCheck.test.js __tests__/unit/identity/resolveIdentity.test.js`
Expected: PASS (behavior unchanged)

- [ ] **Step 3: Write the failing test for the rewritten `AuthController.migrate`**

```javascript
jest.mock('../../../boxes/BoxRepository');
jest.mock('../../../teams/TeamRepository');
jest.mock('../../../infrastructure/logger/logger', () => ({ info: jest.fn() }));

const BoxRepository = require('../../../boxes/BoxRepository');
const TeamRepository = require('../../../teams/TeamRepository');
const { migrate } = require('../../../identity/AuthController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn();
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe('AuthController.migrate', () => {
  test('returns early with migrated: 0 when there is no guest cookie', async () => {
    const req = { auth: { payload: { sub: 'auth-user-1' } }, signedCookies: {} };
    const res = mockRes();
    await migrate(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ migrated: 0 }));
    expect(BoxRepository.reassignOwner).not.toHaveBeenCalled();
  });

  test('reassigns ownership via both repositories, never touches the DB directly', async () => {
    BoxRepository.reassignOwner.mockResolvedValue(2);
    TeamRepository.reassignOwner.mockResolvedValue(1);

    const req = {
      auth: { payload: { sub: 'auth-user-1' } },
      signedCookies: { guest_id: 'guest-1' },
    };
    const res = mockRes();
    await migrate(req, res);

    expect(BoxRepository.reassignOwner).toHaveBeenCalledWith('guest-1', 'auth-user-1');
    expect(TeamRepository.reassignOwner).toHaveBeenCalledWith('guest-1', 'auth-user-1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ migrated: 3 }));
    expect(res.clearCookie).toHaveBeenCalledWith('guest_id', expect.any(Object));
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd Backend && npx jest __tests__/unit/identity/AuthController.test.js`
Expected: FAIL — `Cannot find module '../../../identity/AuthController'`

- [ ] **Step 5: Implement `AuthController.js`**

```javascript
const BoxRepository = require('../boxes/BoxRepository');
const TeamRepository = require('../teams/TeamRepository');
const logger = require('../infrastructure/logger/logger');
const { AUTH_EVENTS } = require('../infrastructure/logger/events');

const migrate = async (req, res) => {
  const authUserId = req.auth.payload.sub;
  const guestId = req.signedCookies?.guest_id;

  if (!guestId) {
    return res.status(200).json({ message: 'No guest session to migrate', migrated: 0 });
  }

  const [migratedBoxes, migratedTeams] = await Promise.all([
    BoxRepository.reassignOwner(guestId, authUserId),
    TeamRepository.reassignOwner(guestId, authUserId),
  ]);

  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('guest_id', {
    httpOnly: true,
    signed: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
  });

  const migrated = migratedBoxes + migratedTeams;

  logger.info(AUTH_EVENTS.GUEST_MIGRATED, {
    authUserId,
    guestId,
    migratedBoxes,
    migratedTeams,
    totalMigrated: migrated,
  });

  return res.status(200).json({ message: `Migrated ${migrated} document(s) to your account`, migrated });
};

module.exports = { migrate };
```

Note: this only reassigns `myBoxes` and `myTeamSets` (player 1's own teams) — matching the original, which also only touched those two collections. `enemyTeamSets` was never user-scoped (queried with `{}`, not `{ userId }`), so it was correctly excluded before and stays excluded now.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd Backend && npx jest __tests__/unit/identity/AuthController.test.js`
Expected: PASS

- [ ] **Step 7: Update route/server wiring**

In `Backend/interfaces/routes/authRoutes.js`, change the require from `../controllers/AuthController` to `../../identity/AuthController`. In `Backend/interfaces/routes/guestRoutes.js`, change the require from `../controllers/GuestController` to `../../identity/GuestController`. In `Backend/server.js`, change `require('./infrastructure/auth/jwtCheck')` to `require('./identity/jwtCheck')` and `require('./infrastructure/auth/resolveIdentity')` to `require('./identity/resolveIdentity')`.

- [ ] **Step 8: Delete the superseded files**

```bash
git rm Backend/infrastructure/auth/jwtCheck.js Backend/infrastructure/auth/resolveIdentity.js \
  Backend/interfaces/controllers/AuthController.js Backend/interfaces/controllers/GuestController.js \
  Backend/__tests__/unit/jwtCheck.test.js Backend/__tests__/unit/resolveIdentity.test.js \
  Backend/__tests__/integration/jwtValidation.test.js
```

- [ ] **Step 9: Commit**

```bash
git add Backend/identity Backend/interfaces/routes/authRoutes.js Backend/interfaces/routes/guestRoutes.js \
  Backend/server.js Backend/__tests__/unit/identity Backend/__tests__/integration/identity
git commit -m "fix: route AuthController.migrate through repositories instead of raw db access"
```

---

### Task 14: Pure-domain relocations — `legality/`, `stats/`, `import/`, `game-data/miscControllers.js`

All files in this task move with zero logic changes — only their own internal require paths shift where they reference each other. This is what finally makes the `legality/pokemonMovesets`, `legality/legalMoves`, `legality/legalAbilities`, `stats/statCalculator`, `stats/typeInteractions`, `import/parsePokemonText` requires used by Tasks 7, 9, and 8 resolve correctly.

**Files:**
- Create: `Backend/legality/legalAbilities.js` (from `Domain/legalAbilites.js` — note the filename typo fix: `legalAbilites` → `legalAbilities`)
- Create: `Backend/legality/legalMoves.js` (from `Domain/legalMoves.js`, unchanged)
- Create: `Backend/legality/pokemonMovesets.js` (from `Domain/pokemonMovesets.js`, unchanged)
- Create: `Backend/legality/validate.js` (from `Domain/pokemon/CalculationDomainService.js`)
- Create: `Backend/stats/statCalculator.js` (from `Domain/statCalculator.js`, unchanged)
- Create: `Backend/stats/typeInteractions.js` (from `Domain/typeInteractions.js`, unchanged)
- Create: `Backend/import/parsePokemonText.js` (from `Domain/parsePokemonText.js`, unchanged)
- Create: `Backend/import/textConversion.js` (from `Domain/textConversion.js`, unchanged)
- Create: `Backend/game-data/miscControllers.js` (from `Controllers/miscControllers.js`)
- Delete: the `Domain/` files listed above, `Backend/Controllers/miscControllers.js`, `Backend/__tests__/unit/miscControllers.test.js` (moved, not dropped)

- [ ] **Step 1: Move the zero-dependency pure functions verbatim**

Copy these files with no content changes at all (none of them require any other file being relocated in this plan):
- `Backend/Domain/legalMoves.js` → `Backend/legality/legalMoves.js`
- `Backend/Domain/pokemonMovesets.js` → `Backend/legality/pokemonMovesets.js`
- `Backend/Domain/statCalculator.js` → `Backend/stats/statCalculator.js`
- `Backend/Domain/typeInteractions.js` → `Backend/stats/typeInteractions.js`
- `Backend/Domain/parsePokemonText.js` → `Backend/import/parsePokemonText.js`
- `Backend/Domain/textConversion.js` → `Backend/import/textConversion.js`

- [ ] **Step 2: Move `legalAbilites.js`, fixing the filename typo**

Copy `Backend/Domain/legalAbilites.js` to `Backend/legality/legalAbilities.js` verbatim (content unchanged, only the filename's spelling is corrected). Every file in this plan that imports it (`createFromImportText.js` in Task 7, `HydrationService.js` in Task 9, `CalculationService.js` in Task 8) already requires it as `../legality/legalAbilities` — this step is what makes those requires resolve.

- [ ] **Step 3: Move `CalculationDomainService.js` as `legality/validate.js`**

Copy `Backend/Domain/pokemon/CalculationDomainService.js` to `Backend/legality/validate.js`. Update its requires (one directory level shallower):

Change:
```javascript
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
const legalMovesFilter = require('../../Domain/legalMoves');
const legalAbilityFilter = require('../../Domain/legalAbilites');
const { STAT_KEYS } = require('./PokemonEntity');
```
to:
```javascript
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
} = require('../Config/jsOptions');
const allAvaliableMoves = require('./pokemonMovesets');
const legalMovesFilter = require('./legalMoves');
const legalAbilityFilter = require('./legalAbilities');
const { STAT_KEYS } = require('../pokemon/PokemonEntity');
```

Change the export from `module.exports = { validate };` to `module.exports = validate;` (a single function export, matching how Task 11's `PokemonSessionController.js` update expects to import it as `const validate = require('../legality/validate');`), and change the function's own definition line from `const validate = (entity) => {` — no change needed there, only the final export line changes.

- [ ] **Step 4: Move `miscControllers.js`**

Copy `Backend/Controllers/miscControllers.js` to `Backend/game-data/miscControllers.js`. Change:
```javascript
const { getModels } = require('../Config/jsonOptions.js');
const { items, natures, movesList, typeChart, abilities, statuses } = getModels();
const { finalHP, finalStats } = require('../Domain/statCalculator.js');
const calcDefenseTypes = require('../Domain/typeInteractions');
```
to:
```javascript
const { getModels } = require('./loadModels');
const { items, natures, movesList, typeChart, abilities, statuses } = getModels();
const { finalHP, finalStats } = require('../stats/statCalculator.js');
const calcDefenseTypes = require('../stats/typeInteractions');
```

- [ ] **Step 5: Move the existing `miscControllers` test**

Copy `Backend/__tests__/unit/miscControllers.test.js` to `Backend/__tests__/unit/game-data/miscControllers.test.js`, updating its require/mock paths to `../../../game-data/miscControllers` and `../../../game-data/loadModels`.

- [ ] **Step 6: Update `Backend/Routes/miscRoutes.js`**

Change the require from `../Controllers/miscControllers` to `../game-data/miscControllers`.

- [ ] **Step 7: Run the full unit suite to confirm every relocated module now resolves**

Run: `cd Backend && npx jest --testPathPatterns=__tests__/unit`
Expected: PASS across the board — this is the first point in the plan where every `legality/`, `stats/`, `import/`, and `game-data/` require introduced in earlier tasks actually resolves, since this task is what creates those files.

- [ ] **Step 8: Delete the superseded files**

```bash
git rm Backend/Domain/legalAbilites.js Backend/Domain/legalMoves.js Backend/Domain/pokemonMovesets.js \
  Backend/Domain/statCalculator.js Backend/Domain/typeInteractions.js Backend/Domain/parsePokemonText.js \
  Backend/Domain/textConversion.js Backend/Domain/pokemon/CalculationDomainService.js \
  Backend/Controllers/miscControllers.js Backend/__tests__/unit/miscControllers.test.js
```

- [ ] **Step 9: Commit**

```bash
git add Backend/legality Backend/stats Backend/import Backend/game-data/miscControllers.js \
  Backend/Routes/miscRoutes.js Backend/__tests__/unit/game-data
git commit -m "refactor: relocate pure domain logic into legality/, stats/, import/, game-data/"
```

---

### Task 15: Final wiring fixes and directory cleanup

Two loose ends from earlier tasks, plus removing every now-empty old directory. `Backend/server.js` still requires `HydrationService` from its pre-Task-9 path (missed when Task 9 moved the file, since that task's steps focused on the box controller, not `server.js`'s own `HydrationService.load()` bootstrap call). `Backend/Domain/pokemon/PokemonEntity.js` — the original location — was superseded by Task 1's new `Backend/pokemon/PokemonEntity.js` but never deleted, since Task 1 only covered creating the new one.

**Files:**
- Modify: `Backend/server.js`
- Delete: `Backend/Domain/pokemon/PokemonEntity.js`, and every directory listed below once confirmed empty

- [ ] **Step 1: Fix `Backend/server.js`'s `HydrationService` require**

Change:
```javascript
const HydrationService = require('./infrastructure/hydration/HydrationService');
```
to:
```javascript
const HydrationService = require('./pokemon/HydrationService');
```

- [ ] **Step 2: Delete the superseded old `PokemonEntity.js`**

```bash
git rm Backend/Domain/pokemon/PokemonEntity.js
```

- [ ] **Step 3: Confirm every old directory is now empty, then remove them**

Run: `find Backend/Domain Backend/Services Backend/Controllers Backend/infrastructure/hydration Backend/infrastructure/calculation Backend/infrastructure/repositories Backend/infrastructure/session Backend/infrastructure/auth Backend/interfaces/controllers -type f 2>/dev/null`
Expected: no output (every file in these directories was relocated by Tasks 1, 6–14)

If the command above prints any file, stop and relocate it before proceeding — it means an earlier task missed something.

```bash
rmdir Backend/Domain/pokemon Backend/Domain/session Backend/Domain \
  Backend/Services Backend/Controllers \
  Backend/infrastructure/hydration Backend/infrastructure/calculation \
  Backend/infrastructure/repositories Backend/infrastructure/session Backend/infrastructure/auth \
  Backend/interfaces/controllers
```

- [ ] **Step 4: Run the full unit test suite**

Run: `cd Backend && npx jest --testPathPatterns=__tests__/unit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/server.js
git commit -m "chore: fix remaining server.js require path, remove emptied legacy directories"
```

---

### Task 16: Full verification pass

**Files:** none created/modified — verification only. `Backend/__tests__/unit/events.test.js` and `Backend/__tests__/unit/redisClient.test.js` are untouched by this plan (`infrastructure/logger/` and `infrastructure/redis/` never moved) and should already be passing throughout; `Backend/__tests__/unit/routeAuthConventions.test.js` inspects route-level auth middleware wiring and should still pass since no route's middleware changed, only which controller file it points to.

- [ ] **Step 1: Run the full unit suite with coverage**

Run: `cd Backend && npm test`
Expected: PASS, all suites green

- [ ] **Step 2: Run the full integration suite**

Run: `cd Backend && npm run test:integration`
Expected: PASS, all suites green (this exercises `mongodb.test.js` and `redis.test.js` against real ephemeral instances via `mongodb-memory-server` and confirms `BoxRepository`/`TeamRepository` work end-to-end, not just against mocks)

- [ ] **Step 3: Start the server and manually smoke-test the regression fix**

Run: `cd Backend && npm run dev`, then in another terminal:
```bash
curl -X POST http://localhost:3500/api/guest/init -c cookies.txt
curl -X POST http://localhost:3500/myBoxes -b cookies.txt
curl -X POST http://localhost:3500/myBoxes/0 -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"pokemonData":"Ditto\nLevel: 50\nAbility: Limber"}'
curl -X PATCH http://localhost:3500/myBoxes/0/Ditto -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"pokemonData":"Ditto\nLevel: 60\nAbility: Limber"}'
```
Expected: the final `PATCH` request (exercising `updateInBox`, Assumption #1's regression) returns `200` with the updated Pokemon at level 60 — not the pre-existing `500 findMyBox is not a function`.

- [ ] **Step 4: Confirm no remaining references to deleted paths**

Run: `grep -rn "Config/jsonOptions\|Services/pokemonService\|Services/formService\|Services/enemyPreviewService\|Controllers/\|Domain/session\|Domain/pokemon\|infrastructure/hydration\|infrastructure/calculation\|infrastructure/repositories\|infrastructure/session\|infrastructure/auth\|interfaces/controllers" Backend --include=*.js -l`
Expected: no output (every reference to a relocated/deleted path was updated by the tasks above)

- [ ] **Step 5: Final commit if Step 3/4 turned up any stray fix**

```bash
git add -A
git commit -m "chore: final verification pass for backend domain cleanup"
```

---

## Self-review

**Spec coverage:** every decision in the design doc has a corresponding task — private-field entities (Tasks 1–3), single-repository-per-aggregate including `AuthController.migrate` (Tasks 5, 6, 13), Pokemon-pipeline unification (Tasks 1, 7, 9), both `formService.js` bug fixes (Task 7), dead-code deletion (Task 7), no Users collection (nothing built for it), and the full target folder structure (Tasks 4, 8–14).

**Placeholder scan:** no `TBD`/`TODO`/"handle appropriately" — every step has complete code or an exact copy-source citation (file + line range) for verbatim moves.

**Type/name consistency check:** `PokemonEntity.applyPatch`/`prepareForSave`/`fromStoredDoc` (Task 1) are called with the same names in `SessionService` (Task 11) and the repositories (Tasks 5–6). `BoxEntity`/`TeamEntity`'s `hasPokemon`/`getPokemon`/`addPokemon`/`removePokemon`/`updatePokemon` (Tasks 2–3) are called identically in `boxControllers.js`/`teamControllers.js`/`pokemonInTeamControllers.js` (Tasks 9–10). `TeamRepository.savePokemon(entity, teamName, pokemonName, userId)`'s 4-argument signature (Task 6) matches every call site (Tasks 10, 11).

**Known gaps intentionally left for the reader:** exact route file names for the damage-calculation mount point (Task 8, Step 4) should be confirmed with `grep` before editing, since it wasn't pinned down during planning; `Backend/Config/jsOptions.js`, `Config/mongodbOptions.js`, `Config/tsOptions.js` were read only partially during the original audit and are left untouched here — flag separately if they turn out to need their own cleanup.

