const { getModels, megaStones } = require('../game-data/loadModels');
const { bannedAbilities, abilityExceptions } = require('../Config/jsOptions.js');
const getPokemonInfo = require('../Domain/parsePokemonText');
const legalAbility = require('../Domain/legalAbilites');
const PokemonEntity = require('./PokemonEntity');

// Species with a permanently fixed gender -- copied verbatim from the current
// Backend/Services/pokemonService.js (~lines 146-153).
const FEMALE_ONLY_SPECIES = new Set([
  'Alcremie', 'Blissey', 'Bounsweet', 'Chansey', 'Cresselia', 'Enamorus', 'Flabébé',
  'Floette', 'Florges', 'Froslass', 'Happiny', 'Hatenna', 'Hatterene', 'Hattrem',
  'Illumise', 'Jynx', 'Kangaskhan', 'Latias', 'Lilligant', 'Mandibuzz', 'Milcery',
  'Miltank', 'Nidoqueen', 'Nidoran♀', 'Nidorina', 'Ogerpon', 'Petilil', 'Salazzle',
  'Smoochum', 'Steenee', 'Tinkatink', 'Tinkaton', 'Tinkatuff', 'Tsareena', 'Vespiquen',
  'Vullaby', 'Wormadam',
]);

// Copied verbatim from pokemonService.js (~lines 155-159).
const MALE_ONLY_SPECIES = new Set([
  'Braviary', 'Fezandipiti', 'Gallade', 'Grimmsnarl', 'Hitmonchan', 'Hitmonlee',
  'Hitmontop', 'Impidimp', 'Landorus', 'Latios', 'Morgrem', 'Mothim', 'Munkidori',
  'Nidoking', 'Nidoran♂', 'Nidorino', 'Okidogi', 'Rufflet', 'Sawk', 'Tauros', 'Throh',
  'Thundurus', 'Tornadus', 'Tyrogue', 'Volbeat',
]);

// Copied verbatim from pokemonService.js (~lines 161-183) -- the full genderless list.
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

// Domain/parsePokemonText.js never declares `nature` with let/const, so it
// leaks as an implicit global holding the raw nature object (e.g.
// { increase: 'Spe', decrease: 'SpA' }) rather than its string name.
// PokemonEntity requires nature as a string, so resolve it back to its name
// the same way PokemonEntity's own legacy-doc resolution does.
const resolveNatureName = (nature, natures) => {
  if (!nature) return 'Hardy';
  if (typeof nature === 'string') return nature;
  if (typeof nature.name === 'string') return nature.name;
  const entries = Object.entries(natures);
  const match = entries.find(
    (entry) => entry[1].increase === nature.increase && entry[1].decrease === nature.decrease,
  );
  return match ? match[0] : 'Hardy';
};

// Domain/parsePokemonText.js assigns `item` as the raw item object from the
// items model (e.g. { name: 'Life Orb' }) rather than its string key, or the
// literal string 'None' when no item is recognized. PokemonEntity requires
// item as a string, so resolve it back to its name the same way
// PokemonEntity's own legacy-doc resolution (resolveLegacyItemName) does.
const resolveItemName = (item, items) => {
  if (!item || item === 'None') return '';
  if (typeof item === 'string') return item;
  if (typeof item.name === 'string') return item.name;
  const serialized = JSON.stringify(item);
  const entries = Object.entries(items);
  const match = entries.find((entry) => JSON.stringify(entry[1]) === serialized);
  return match ? match[0] : '';
};

const inferGender = (name, parsedGender) => {
  if (FEMALE_ONLY_SPECIES.has(name)) return 'F';
  if (MALE_ONLY_SPECIES.has(name)) return 'M';
  if (GENDERLESS_SPECIES.has(name)) return 'N';
  if (parsedGender === 'M' || parsedGender === 'F') return parsedGender;
  // Original pipeline left this as the unvalidated literal 'Both'.
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
    nature: resolveNatureName(parsed.nature, natures),
    item: resolveItemName(parsed.item, items),
    ability_id: finalAbility,
    move_ids: parsed.moves,
    EVs: parsed.EVs,
    IVs: parsed.IVs,
    player,
  });
};

module.exports = createFromImportText;
