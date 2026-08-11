jest.mock('../../../game-data/loadModels', () => ({
  getModels: () => ({
    species2: {
      'Blaziken-Mega': { name: 'Blaziken-Mega', abilities: ['Speed Boost'] },
      Blaziken: { name: 'Blaziken', abilities: ['Blaze', 'Speed Boost'] },
    },
  }),
}));

const { checkMega, addMega } = require('../../../forms/checkMega');

describe('checkMega', () => {
  test('detects a -Mega suffix in import text', () => {
    expect(checkMega('Blaziken-Mega\nLevel: 50')).toBe(true);
  });

  test('detects Greninja-Ash by name', () => {
    expect(checkMega('Greninja-Ash\nLevel: 50')).toBe(true);
  });

  test('returns false for a normal species', () => {
    expect(checkMega('Blaziken\nLevel: 50')).toBe(false);
  });
});

describe('addMega', () => {
  test('throws a clear error when the mega species is not in the database', () => {
    expect(() => addMega('Not-A-Mega @ Item\nLevel: 50\nAbility: Blaze', 1)).toThrow(
      "isn't a pokemon in the database (addMega)",
    );
  });
});
