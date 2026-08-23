// Manually hydrated, already-resolved Pokemon — mirrors HARDCODED_BULBASAUR in
// Backend/enemy-preview/enemyPreviewService.js. This is a static onboarding
// fixture (not real trainer/team data), so there is nothing to look up from a
// database and nothing to keep synced with a resolver pipeline.
const GUEST_STARTER_PIKACHU = {
  name: 'Pikachu',
  form: 'Pikachu',
  ID: 25,
  sprite: 'https://raw.githubusercontent.com/funnotbun/funnotbun.github.io/main/data/species/frontspr/gFrontSprite025Pikachu.png',
  femaleSprite: false,
  gender: 'M',
  level: 8,
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
    { name: 'Volt Tackle', num: 344, accuracy: 100, basePower: 120, category: 'Physical', pp: 15, priority: 0, type: 'Electric', target: 'normal', secondary: { chance: 10, status: 'par' }, shortDesc: 'Has 33% recoil. 10% chance to paralyze target.' },
    { name: 'Thunderbolt', num: 85, accuracy: 100, basePower: 90, category: 'Special', pp: 15, priority: 0, type: 'Electric', target: 'normal', secondary: { chance: 10, status: 'par' }, shortDesc: '10% chance to paralyze the target.' },
    { name: 'Iron Tail', num: 231, accuracy: 75, basePower: 100, category: 'Physical', pp: 15, priority: 0, type: 'Steel', target: 'normal', secondary: { chance: 30, boosts: { def: -1 } }, shortDesc: "30% chance to lower the target's Defense by 1." },
    { name: 'Quick Attack', num: 98, accuracy: 100, basePower: 40, category: 'Physical', pp: 30, priority: 1, type: 'Normal', target: 'normal', secondary: null, shortDesc: 'Usually goes first.' },
  ],
  allMoves: [],
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
    allMoves: [],
  },
};

module.exports = { GUEST_STARTER_PIKACHU };
