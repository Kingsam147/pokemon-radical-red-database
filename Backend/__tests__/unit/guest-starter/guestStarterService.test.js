const { GUEST_STARTER_PIKACHU } = require('../../../guest-starter/guestStarterService');

describe('guestStarterService', () => {
  test('exports a fully-resolved Level 8 Pikachu with the expected build', () => {
    expect(GUEST_STARTER_PIKACHU.name).toBe('Pikachu');
    expect(GUEST_STARTER_PIKACHU.ID).toBe(25);
    expect(GUEST_STARTER_PIKACHU.level).toBe(8);
    expect(GUEST_STARTER_PIKACHU.gender).toBe('M');
    expect(GUEST_STARTER_PIKACHU.nature).toEqual({ name: 'Naughty', increase: 'Atk', decrease: 'SpD' });
    expect(GUEST_STARTER_PIKACHU.ability).toEqual({ name: 'Lightning Rod', description: '', toggle: false });
    expect(GUEST_STARTER_PIKACHU.item).toEqual({ name: 'Light Ball', spriteName: 'light-ball', description: '' });
    expect(GUEST_STARTER_PIKACHU.type1.name).toBe('Electric');
    expect(GUEST_STARTER_PIKACHU.type2.name).toBe('None');
    expect(GUEST_STARTER_PIKACHU.IVs).toEqual({ HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 });
    expect(GUEST_STARTER_PIKACHU.EVs).toEqual({ HP: 0, Atk: 252, Def: 0, SpA: 0, SpD: 0, Spe: 252 });
    expect(GUEST_STARTER_PIKACHU.finalStats).toEqual({ HP: 26, Atk: 23, Def: 13, SpA: 15, SpD: 13, Spe: 26 });
    expect(GUEST_STARTER_PIKACHU.moveset.map((m) => m.name)).toEqual([
      'Volt Tackle', 'Thunderbolt', 'Iron Tail', 'Quick Attack',
    ]);
    expect(GUEST_STARTER_PIKACHU.moveset[0]).toMatchObject({ basePower: 120, category: 'Physical', type: 'Electric' });
    expect(GUEST_STARTER_PIKACHU.forms.Pikachu.formName).toBe('Pikachu');
  });
});
