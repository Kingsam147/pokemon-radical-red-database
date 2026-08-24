const redis = require('../infrastructure/redis/redisClient');
const TeamRepository = require('../teams/TeamRepository');

const ENEMY_PREVIEW_KEY = 'enemy:preview:hydrated';
const ENEMY_PREVIEW_TTL = 86400; // 24 hours — matches P2_TEAMS_TTL convention

// Manually hydrated preview Pokemon — kept in sync by hand rather than going
// through HydrationService, since this endpoint's frontend consumer resolves
// with empty lookup tables (it renders before misc data loads). Values sourced
// from species2.Bulbasaur / abilities / natures / moves / typeChart directly;
// treat this as scaffolding, not the long-term fix — the real /teams/2 pipeline
// goes through HydrationService in teamControllers.js.
// Sprite is the S3 pokemon/{ID}.png convention (see Frontend/lib/utils/sprites.ts
// POKEMON_SPRITES) — matches how every other Pokemon in the app resolves its sprite.
const BULBASAUR_SPRITE = 'https://pokemon-radical-red.s3.us-east-2.amazonaws.com/pokemon/1.png';

const HARDCODED_BULBASAUR = {
  name: 'Bulbasaur',
  form: 'Bulbasaur',
  ID: 1,
  sprite: BULBASAUR_SPRITE,
  femaleSprite: false,
  gender: 'Both',
  level: 5,
  item: { name: 'None', spriteName: 'none', description: '' },
  nature: { name: 'Bashful', increase: 'Spe', decrease: 'Spe' },
  ability: { name: 'Overgrow', description: '', toggle: false },
  abilities: [
    { name: 'Overgrow', description: '', toggle: false },
    { name: 'Chlorophyll', description: '', toggle: false },
  ],
  type1: { name: 'Grass', Normal: 1, Fire: 2, Water: 0.5, Electric: 0.5, Grass: 0.5, Ice: 2, Fighting: 1, Poison: 2, Ground: 0.5, Flying: 2, Psychic: 1, Bug: 2, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 1, Fairy: 1 },
  type2: { name: 'Poison', Normal: 1, Fire: 1, Water: 1, Electric: 1, Grass: 0.5, Ice: 1, Fighting: 0.5, Poison: 0.5, Ground: 2, Flying: 1, Psychic: 2, Bug: 0.5, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 1, Fairy: 0.5 },
  baseStats: { HP: 45, Atk: 49, Def: 49, SpA: 65, SpD: 65, Spe: 45 },
  EVs: { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
  IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
  finalStats: { HP: 21, Atk: 11, Def: 11, SpA: 13, SpD: 13, Spe: 11 },
  statBoosts: { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
  moveset: [
    { name: 'Tackle', num: 33, accuracy: 100, basePower: 40, category: 'Physical', pp: 35, priority: 0, type: 'Normal', target: 'normal', secondary: null, shortDesc: 'No additional effect.' },
    { name: 'Growl', num: 45, accuracy: 100, basePower: 0, category: 'Status', pp: 40, priority: 0, type: 'Normal', target: 'allAdjacentFoes', boosts: { atk: -1 }, secondary: null, shortDesc: 'Lowers the foe(s) Attack by 1.' },
  ],
  allMoves: [],
  forms: {},
  version: 0,
};
HARDCODED_BULBASAUR.forms = {
  Bulbasaur: {
    formName: 'Bulbasaur',
    ID: HARDCODED_BULBASAUR.ID,
    sprite: HARDCODED_BULBASAUR.sprite,
    type1: HARDCODED_BULBASAUR.type1,
    type2: HARDCODED_BULBASAUR.type2,
    ability: HARDCODED_BULBASAUR.ability,
    abilities: HARDCODED_BULBASAUR.abilities,
    baseStats: HARDCODED_BULBASAUR.baseStats,
    finalStats: HARDCODED_BULBASAUR.finalStats,
    allMoves: [],
  },
};

const buildEnemyPreview = async () => {
  const allTeams = await TeamRepository.loadAllTeams(2, null);
  const teamNames = Object.keys(allTeams);
  if (teamNames.length === 0) return null;

  const teamName = teamNames[0];
  const team = {
    Bulbasaur: HARDCODED_BULBASAUR,
    trainerInfo: {
      name: teamName,
      rules: '',
      format: 'Singles',
      partner: '',
      myPartner: '',
    },
  };

  return { teamName, team };
};

const getHydratedEnemyPreview = async () => {
  const cached = await redis.get(ENEMY_PREVIEW_KEY);
  if (cached) return cached;

  const preview = await buildEnemyPreview();
  if (preview) await redis.set(ENEMY_PREVIEW_KEY, preview, ENEMY_PREVIEW_TTL);
  return preview;
};

const invalidateEnemyPreview = () => redis.del(ENEMY_PREVIEW_KEY);

module.exports = {
  getHydratedEnemyPreview,
  invalidateEnemyPreview,
  ENEMY_PREVIEW_KEY,
};
