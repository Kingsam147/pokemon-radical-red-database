const { GUEST_STARTER_PIKACHU } = require('../../../guest-starter/guestStarterService');

describe('guestStarterService', () => {
  test('exports a fully-resolved Level 5 Pikachu with the expected build', () => {
    expect(GUEST_STARTER_PIKACHU.name).toBe('Pikachu');
    expect(GUEST_STARTER_PIKACHU.ID).toBe(25);
    expect(GUEST_STARTER_PIKACHU.level).toBe(5);
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
      'Thunder Shock', 'Fake Out', 'Baby-Doll Eyes', 'Tail Whip',
    ]);
    expect(GUEST_STARTER_PIKACHU.moveset[0]).toMatchObject({ basePower: 40, category: 'Special', type: 'Electric' });
    expect(GUEST_STARTER_PIKACHU.forms.Pikachu.formName).toBe('Pikachu');
  });

  test('sprite is the S3 pokemon/{ID}.png convention, not a third-party URL', () => {
    expect(GUEST_STARTER_PIKACHU.sprite).toBe('https://pokemon-radical-red.s3.us-east-2.amazonaws.com/pokemon/25.png');
    expect(GUEST_STARTER_PIKACHU.forms.Pikachu.sprite).toBe(GUEST_STARTER_PIKACHU.sprite);
  });

  test('allMoves is the real level-5 legal movepool, computed the same way HydrationService does', () => {
    expect(GUEST_STARTER_PIKACHU.allMoves).toEqual([
      'Baby-Doll Eyes', 'Brick Break', 'Dig', 'Electroweb', 'Facade', 'Fake Out',
      'Flash', 'Growl', 'Iron Tail', 'Light Screen', 'Play Rough', 'Reflect',
      'Rest', 'Return', 'Sleep Talk', 'Tail Whip', 'Thief', 'Thunder Punch',
      'Thunder Shock', 'Thunderbolt', 'Volt Switch',
    ]);
    expect(GUEST_STARTER_PIKACHU.forms.Pikachu.allMoves).toEqual(GUEST_STARTER_PIKACHU.allMoves);
  });
});
