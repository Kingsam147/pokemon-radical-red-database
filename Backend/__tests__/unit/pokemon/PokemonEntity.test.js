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
