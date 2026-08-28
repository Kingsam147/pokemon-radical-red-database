const species2 = {
  TestMon: {
    name: 'TestMon',
    abilities: ['Overgrow'],
    levelUpLearnsets: [['Tackle', 1]],
    TMHMLearnsets: [],
    tutorLearnsets: [],
    eggMovesLearnsets: [],
  },
};

jest.mock('../../../game-data/loadModels', () => ({
  getModels: () => ({
    species2,
    natures: { Jolly: {} },
    items: {},
  }),
  avaliableTMS: [],
}));

jest.mock('../../../game-data/jsOptions', () => ({
  isEggMoves: false,
  tutorLevel: 0,
  tutorTable: { 0: [] },
  bannedMoves: [],
  leechSeedExceptions: [],
  toxicExceptions: [],
  bannedAbilities: {},
  abilityExceptions: {},
}));

const validate = require('../../../legality/validate');

const baseEntity = (overrides = {}) => ({
  name: 'TestMon',
  form: 'TestMon',
  nature: 'Jolly',
  item: '',
  ability_id: 'Overgrow',
  move_ids: ['Tackle'],
  EVs: { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
  IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
  player: 1,
  level: 5,
  ...overrides,
});

describe('validate move-legality gating', () => {
  test('restrictedMode true rejects a move not in the persisted allMoves', () => {
    const entity = baseEntity({
      move_ids: ['Hyper Beam'],
      allMoves: [{ name: 'Tackle' }],
    });
    const { valid, errors } = validate(entity, { restrictedMode: true });
    expect(valid).toBe(false);
    expect(errors).toContain('"Hyper Beam" is not in TestMon\'s legal move pool');
  });

  test('defaults to unrestricted: no options skips the movepool check entirely', () => {
    const entity = baseEntity({
      move_ids: ['Hyper Beam'],
      allMoves: [{ name: 'Tackle' }],
    });
    const { valid, errors } = validate(entity);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  test('restrictedMode true accepts a move present in the persisted allMoves', () => {
    const entity = baseEntity({
      move_ids: ['Hyper Beam'],
      allMoves: [{ name: 'Tackle' }, { name: 'Hyper Beam' }],
    });
    const { valid } = validate(entity, { restrictedMode: true });
    expect(valid).toBe(true);
  });

  test('restrictedMode false skips the movepool check entirely, even with no allMoves', () => {
    const entity = baseEntity({ move_ids: ['Hyper Beam'] });
    const { valid, errors } = validate(entity, { restrictedMode: false });
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  test('falls back to the static movepool computation when allMoves was never persisted', () => {
    const entity = baseEntity({ move_ids: ['Tackle'] });
    const { valid } = validate(entity, { restrictedMode: true });
    expect(valid).toBe(true);
  });

  test('static fallback still rejects moves outside the legal pool', () => {
    const entity = baseEntity({ move_ids: ['Hyper Beam'] });
    const { valid, errors } = validate(entity, { restrictedMode: true });
    expect(valid).toBe(false);
    expect(errors).toContain('"Hyper Beam" is not in TestMon\'s legal move pool');
  });

  test('unrelated validation (species/nature/ability) still runs regardless of restrictedMode', () => {
    const entity = baseEntity({ name: 'NotReal', move_ids: [] });
    const { valid, errors } = validate(entity, { restrictedMode: false });
    expect(valid).toBe(false);
    expect(errors).toContain('"NotReal" is not a valid Pokémon species');
  });
});
