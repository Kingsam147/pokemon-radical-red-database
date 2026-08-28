// Manually hydrated, already-resolved Pokemon — mirrors HARDCODED_BULBASAUR in
// Backend/enemy-preview/enemyPreviewService.js. This is a static onboarding
// fixture (not real trainer/team data), so there is nothing to look up from a
// database and nothing to keep synced with a resolver pipeline.
// Sprite and allMoves are built the same way the frontend's own hydration
// paths build them: sprite is the S3 pokemon/{ID}.png convention (see
// Frontend/lib/utils/sprites.ts POKEMON_SPRITES), and allMoves is the real
// level-5 legal movepool computed via allAvaliableMoves + legalMoves — the
// same functions Backend/pokemon/HydrationService.js calls for player 1 —
// against the Pikachu species entry, then hardcoded here since this fixture
// has nothing to resolve against at request time.
const PIKACHU_SPRITE = 'https://pokemon-radical-red.s3.us-east-2.amazonaws.com/pokemon/25.png';
const PIKACHU_ALL_MOVES = [
  'Baby-Doll Eyes', 'Brick Break', 'Dig', 'Electroweb', 'Facade', 'Fake Out',
  'Flash', 'Growl', 'Iron Tail', 'Light Screen', 'Play Rough', 'Reflect',
  'Rest', 'Return', 'Sleep Talk', 'Tail Whip', 'Thief', 'Thunder Punch',
  'Thunder Shock', 'Thunderbolt', 'Volt Switch',
];

const GUEST_STARTER_PIKACHU = {
  name: 'Pikachu',
  form: 'Pikachu',
  ID: 25,
  sprite: PIKACHU_SPRITE,
  femaleSprite: false,
  gender: 'M',
  level: 5,
  item: { name: 'Light Ball', spriteName: 'light-ball', description: '' },
  nature: { name: 'Naughty', increase: 'Atk', decrease: 'SpD' },
  ability: { name: 'Lightning Rod', description: '', toggle: false },
  abilities: [
    { name: 'Static', description: '', toggle: false },
    { name: 'Lightning Rod', description: '', toggle: false },
  ],
  type1: { name: 'Electric', Normal: 1, Fire: 1, Water: 1, Electric: 0.5, Grass: 1, Ice: 1, Fighting: 1, Poison: 1, Ground: 2, Flying: 0.5, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 1 },
  type2: { name: 'None' },
  baseStats: { HP: 35, Atk: 55, Def: 40, SpA: 50, SpD: 50, Spe: 90 },
  EVs: { HP: 0, Atk: 252, Def: 0, SpA: 0, SpD: 0, Spe: 252 },
  IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
  finalStats: { HP: 26, Atk: 23, Def: 13, SpA: 15, SpD: 13, Spe: 26 },
  statBoosts: { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
  moveset: [
    { name: 'Thunder Shock', num: 84, accuracy: 100, basePower: 40, category: 'Special', pp: 30, priority: 0, type: 'Electric', target: 'normal', secondary: { chance: 10, status: 'par' }, shortDesc: '10% chance to paralyze the target.' },
    { name: 'Fake Out', num: 252, accuracy: 100, basePower: 40, category: 'Physical', pp: 5, priority: 3, type: 'Normal', target: 'normal', secondary: { chance: 100, volatileStatus: 'flinch' }, shortDesc: 'Hits first. First turn out only. 100% flinch chance.' },
    { name: 'Baby-Doll Eyes', num: 608, accuracy: 100, basePower: 0, category: 'Status', pp: 30, priority: 1, type: 'Fairy', target: 'normal', boosts: { atk: -1 }, secondary: null, shortDesc: "Lowers the target's Attack by 1." },
    { name: 'Tail Whip', num: 39, accuracy: 100, basePower: 0, category: 'Status', pp: 30, priority: 0, type: 'Normal', target: 'allAdjacentFoes', boosts: { def: -1 }, secondary: null, shortDesc: "Lowers the foe(s) Defense by 1." },
  ],
  allMoves: PIKACHU_ALL_MOVES,
  forms: {},
  version: 0,
};
GUEST_STARTER_PIKACHU.forms = {
  Pikachu: {
    formName: 'Pikachu',
    ID: GUEST_STARTER_PIKACHU.ID,
    sprite: GUEST_STARTER_PIKACHU.sprite,
    type1: GUEST_STARTER_PIKACHU.type1,
    type2: GUEST_STARTER_PIKACHU.type2,
    ability: GUEST_STARTER_PIKACHU.ability,
    abilities: GUEST_STARTER_PIKACHU.abilities,
    baseStats: GUEST_STARTER_PIKACHU.baseStats,
    finalStats: GUEST_STARTER_PIKACHU.finalStats,
    allMoves: PIKACHU_ALL_MOVES,
  },
};

module.exports = { GUEST_STARTER_PIKACHU };
