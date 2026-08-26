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

jest.mock('../../../game-data/jsOptions.js', () => ({
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

const importTextWithItem = `Blaziken @ Wide Lens
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
    expect(entity.item).toBe('');
  });

  test('resolves a recognized held item to its string name', () => {
    const entity = createFromImportText(importTextWithItem, 1);
    expect(entity.item).toBe('Wide Lens');
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
