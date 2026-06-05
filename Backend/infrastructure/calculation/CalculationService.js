const crypto = require('crypto');
const { calculate: smogonCalculate, Pokemon, Move, Field, Side, Generations } = require('@smogon/calc');
const { getModels } = require('../../Config/jsonOptions');
const { items: smogonItems, abilities: smogonAbilities } = require('../../Config/tsOptions');
const calcDefenseType = require('../../Domain/typeInteractions');

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map();

const STATUS_MAP = {
  Healthy: '', Burn: 'brn', Burned: 'brn', Freeze: 'frz', Frozen: 'frz',
  Paralysis: 'par', Paralyzed: 'par', Poison: 'psn', Poisoned: 'psn',
  'Badly Poison': 'tox', 'Badly Poisoned': 'tox', Sleep: 'slp', Asleep: 'slp', Fainted: '',
};

const WEATHER_MAP = {
  Sun: 'Sun', 'Harsh Sunshine': 'Harsh Sunshine', Rain: 'Rain',
  'Heavy Rain': 'Heavy Rain', Sand: 'Sand', Snow: 'Snow', 'Strong Winds': 'Strong Winds',
};

const TERRAIN_MAP = {
  'Electric Terrain': 'Electric', 'Grassy Terrain': 'Grassy',
  'Misty Terrain': 'Misty', 'Psychic Terrain': 'Psychic',
};

// ─── Cache helpers ────────────────────────────────────────────────────────────

const stableStringify = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
};

const buildCacheKey = (attacker, move, defender, field, abilityToggles) => {
  const hash = (obj) => crypto.createHash('sha1').update(stableStringify(obj)).digest('hex').slice(0, 8);
  const slugify = (name) => (name ?? '').replace(/[^a-z0-9]/gi, '_').toLowerCase();

  const pokemonId = `${slugify(attacker.name)}_${hash({ attacker, field, abilityToggles })}`;
  const moveId = slugify(move?.name ?? 'unknown');
  const targetId = `${slugify(defender.name)}_${hash(defender)}`;

  return `calc:${pokemonId}:${moveId}:${targetId}`;
};

const cacheGet = (key) => {
  const record = cache.get(key);
  if (!record) return null;
  if (Date.now() > record.expiresAt) {
    cache.delete(key);
    return null;
  }
  return record.result;
};

const cacheSet = (key, result) => {
  cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
};

// ─── Smogon helpers ───────────────────────────────────────────────────────────

const getPokemonOverrides = (pokemonName, species2) => {
  const data = species2[pokemonName];
  if (!data) return {};
  return {
    rawStats: {
      hp: data.baseHP, atk: data.baseAttack, def: data.baseDefense,
      spa: data.baseSpAttack, spd: data.baseSpDefense, spe: data.baseSpeed,
    },
    types: [data.type1, data.type2].filter(t => t && t !== 'None'),
  };
};

const sanitizeItem = (itemName) => {
  if (!itemName) return '';
  try { return smogonItems.includes(itemName) ? itemName : ''; } catch { return ''; }
};

const sanitizeAbility = (abilityName) => {
  if (!abilityName) return 'No Ability';
  try { return smogonAbilities.includes(abilityName) ? abilityName : 'No Ability'; } catch { return 'No Ability'; }
};

// ─── Radical Red ability modifier ─────────────────────────────────────────────

const applyRadicalRedAbilityFixes = (damageArray, attacker, defender, move, field, abilityToggles = {}, typeChart) => {
  let modifier = 1;

  if (attacker.ability === 'Illusion' && abilityToggles.illusion) modifier *= 1.3;

  if (attacker.ability === 'Defeatist') {
    const hpPercent = attacker.currentHP / attacker.maxHP;
    // RR lowers the Defeatist threshold from 50% to 33%
    modifier *= (hpPercent <= 0.33 ? 0.5 : 1) / (hpPercent <= 0.5 ? 0.5 : 1);
  }

  // RR raises Iron Fist from 1.2x to 1.3x — undo vanilla then apply RR multiplier
  if (attacker.ability === 'Iron Fist' && move.flags?.punch === 1) modifier *= 1.3 / 1.2;

  if (attacker.ability === 'Rivalry' && attacker.gender !== defender.gender) modifier *= 1.25 / 0.75;

  if (attacker.ability === 'Mega Launcher' && ['Flash Cannon', 'Spike Cannon', 'Snipe Shot'].includes(move.name)) modifier *= 1.5;
  if (attacker.ability === 'Liquid Voice' && move.flags?.sound === 1) modifier *= 1.2;
  if (attacker.ability === 'Reckless' && ['Explosion', 'Self-Destruct', 'Misty Explosion'].includes(move.name)) modifier *= 1.2;

  if (defender.ability === 'Bulletproof' && ['Snipe Shot', 'Flash Cannon', 'Spike Cannon'].includes(move.name)) modifier *= 0;
  if (defender.ability === 'Water Compaction' && move.type === 'Water') modifier *= 0.5;
  if (defender.ability === 'Flower Gift' && field?.weather === 'Sun') modifier /= 1.5;

  if (attacker.ability === 'Striker' && move.flags?.kick === 1) modifier *= 1.3;
  if (attacker.ability === 'Feline Prowess' && move.category === 'Special') modifier *= 2;
  if (attacker.ability === 'Sage Power' && move.category === 'Special') modifier *= 1.5;
  if (attacker.ability === 'ORAORAORAORA' && move.flags?.punch === 1) modifier *= 1.5;
  if (attacker.ability === 'Bull Rush' && abilityToggles.bullRush && move.category === 'Physical') modifier *= 1.2;

  if (attacker.ability === 'Fatal Precision') {
    const defense = calcDefenseType(defender.types, typeChart);
    if ([...defense.weaknesses, ...defense.doubleWeaknesses].includes(move.type)) modifier *= 1.2;
  }

  if (attacker.ability === 'Bone Zone' && move.type === 'Ground') {
    const defense = calcDefenseType(defender.types, typeChart);
    if ([...defense.resistances, ...defense.doubleResists].includes(move.type)) modifier *= 2;
  }

  if (attacker.ability === 'Cash Splash') {
    if (move.type === 'Water') modifier *= 2;
    if (attacker.status === 'Burned' && move.category === 'Physical') modifier *= 2;
  }

  if (attacker.ability === 'Quill Rush' && abilityToggles.quillRush && move.category === 'Physical') modifier *= 2;

  if (defender.ability === 'Mountaineer' && move.type === 'Rock') modifier *= 0;

  if (defender.ability === 'Primal Armor') {
    const defense = calcDefenseType(defender.types, typeChart);
    if ([...defense.weaknesses, ...defense.doubleWeaknesses].includes(move.type)) modifier *= 0.5;
  }

  if (defender.ability === 'Blubber Defense' && defender.rawStats.hp === defender.originalCurHP) modifier *= 0.5;
  if (defender.ability === 'Cash Splash' && move.type === 'Fire') modifier *= 0.5;

  return damageArray.map(d => Math.floor(d * modifier));
};

// ─── Core calculation ─────────────────────────────────────────────────────────

const performCalculation = ({ attacker, defender, move, field, abilityToggles = {} }) => {
  const { species2, movesList: allMoves, typeChart } = getModels();
  const gen = Generations.get(9);

  const attackerOverrides = getPokemonOverrides(attacker.name, species2);
  let defenderOverrides = getPokemonOverrides(defender.name, species2);

  if (attacker.ability === 'Bone Zone' && move.name) {
    const sanitizedMoveName = move.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (allMoves[sanitizedMoveName]?.type === 'Ground') {
      defenderOverrides = {
        ...defenderOverrides,
        types: defenderOverrides.types?.filter(t => t !== 'Flying') ?? defenderOverrides.types,
      };
      if (defender.ability === 'Levitate' || defender.ability === 'Earth Eater') defenderOverrides.ability = '';
      if (defender.item === 'Air Balloon') defenderOverrides.item = '';
    }
  }

  if (attacker.ability === 'Corrosion' && move.type === 'Poison' && defender.types?.includes('Steel')) {
    defenderOverrides = {
      ...defenderOverrides,
      types: defenderOverrides.types?.filter(t => t !== 'Steel'),
    };
  }

  const p1 = new Pokemon(gen, attacker.name, {
    level: attacker.level,
    nature: attacker.nature?.toLowerCase().replace(/\s/g, ''),
    evs: attacker.evs,
    ivs: attacker.ivs,
    boosts: attacker.boosts,
    item: sanitizeItem(attacker.item),
    ability: sanitizeAbility(attacker.ability),
    abilityOn: attacker.abilityOn,
    status: STATUS_MAP[attacker.status] ?? '',
    gender: attacker.gender,
    originalCurHP: attacker.currentHP,
    alliesFainted: attacker.alliesFainted ?? 0,
    ...attackerOverrides,
  });

  const p2 = new Pokemon(gen, defender.name, {
    level: defender.level,
    nature: defender.nature?.toLowerCase().replace(/\s/g, ''),
    evs: defender.evs,
    ivs: defender.ivs,
    boosts: defender.boosts,
    item: sanitizeItem(defenderOverrides.item ?? defender.item),
    ability: sanitizeAbility(defenderOverrides.ability ?? defender.ability),
    abilityOn: defender.abilityOn,
    status: STATUS_MAP[defender.status] ?? '',
    gender: defender.gender,
    originalCurHP: defender.currentHP,
    ...defenderOverrides,
  });

  const sanitizedMoveName = move.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const moveData = allMoves[sanitizedMoveName];

  if (!moveData) {
    const error = new Error(`Move "${move.name}" not found in database`);
    error.status = 404;
    throw error;
  }

  const moveObj = new Move(gen, move.name, {
    isCrit: move.isCrit ?? false,
    isZ: move.isZ ?? false,
    overrides: moveData,
  });

  const fieldData = new Field({
    weather: WEATHER_MAP[field?.weather] ?? undefined,
    terrain: TERRAIN_MAP[field?.terrain] ?? undefined,
    isGravity: field?.isGravity ?? false,
    isMagicRoom: field?.isMagicRoom ?? false,
    isWonderRoom: field?.isWonderRoom ?? false,
    attackerSide: new Side({
      isReflect: field?.attackerSide?.isReflect ?? false,
      isLightScreen: field?.attackerSide?.isLightScreen ?? false,
      isAuroraVeil: field?.attackerSide?.isAuroraVeil ?? false,
      isTailwind: field?.attackerSide?.isTailwind ?? false,
      isHelpingHand: field?.attackerSide?.isHelpingHand ?? false,
      isFlowerGift: field?.attackerSide?.isFlowerGift ?? false,
      isFriendGuard: field?.attackerSide?.isFriendGuard ?? false,
    }),
    defenderSide: new Side({
      isReflect: field?.defenderSide?.isReflect ?? false,
      isLightScreen: field?.defenderSide?.isLightScreen ?? false,
      isAuroraVeil: field?.defenderSide?.isAuroraVeil ?? false,
      isTailwind: field?.defenderSide?.isTailwind ?? false,
      spikes: field?.defenderSide?.spikes ?? 0,
      isSR: field?.defenderSide?.isSR ?? false,
      isStickyWeb: field?.defenderSide?.isStickyWeb ?? false,
    }),
  });

  const result = smogonCalculate(gen, p1, p2, moveObj, fieldData);

  let rawDamage;
  if (!result.damage || result.damage === 0) {
    rawDamage = Array(16).fill(0);
  } else if (!Array.isArray(result.damage)) {
    rawDamage = Array(16).fill(result.damage);
  } else if (Array.isArray(result.damage[0])) {
    const summed = result.damage.map(roll => roll.reduce((a, b) => a + b, 0));
    rawDamage = summed.length === 1 ? Array(16).fill(summed[0]) : summed;
  } else {
    rawDamage = result.damage.length === 1 ? Array(16).fill(result.damage[0]) : result.damage;
  }

  const correctedDamage = applyRadicalRedAbilityFixes(
    rawDamage,
    {
      ability: attacker.ability,
      currentHP: attacker.currentHP,
      maxHP: attacker.maxHP || p1.maxHP(),
      status: attacker.status,
      gender: attacker.gender,
      types: p1.types,
      rawStats: attackerOverrides.rawStats,
      evs: attacker.evs,
      ivs: attacker.ivs,
      level: attacker.level,
      originalCurHP: attacker.currentHP,
    },
    {
      ability: defender.ability,
      item: defender.item,
      types: p2.types,
      gender: defender.gender,
      rawStats: defenderOverrides.rawStats,
      evs: defender.evs,
      ivs: defender.ivs,
      level: defender.level,
      originalCurHP: defender.currentHP,
    },
    moveData,
    field,
    abilityToggles,
    typeChart,
  );

  const defenderHP = p2.maxHP();
  const correctedMin = Math.min(...correctedDamage);
  const correctedMax = Math.max(...correctedDamage);

  let description;
  try { description = result.desc(); } catch { description = result.moveDesc ?? move.name ?? ''; }

  return {
    damage: correctedDamage,
    range: [
      `${Math.round(((correctedMin / defenderHP) * 100).toFixed(1))}%`,
      `${Math.round(((correctedMax / defenderHP) * 100).toFixed(1))}%`,
    ],
    description,
    rrModifiersApplied: true,
  };
};

// ─── Cache-Aside facade ───────────────────────────────────────────────────────

const calculate = ({ attacker, defender, move, field, abilityToggles }) => {
  const key = buildCacheKey(attacker, move, defender, field, abilityToggles);

  const cached = cacheGet(key);
  if (cached) return cached;

  const result = performCalculation({ attacker, defender, move, field, abilityToggles });
  cacheSet(key, result);
  return result;
};

module.exports = { calculate };
