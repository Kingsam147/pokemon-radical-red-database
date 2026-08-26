const species2 = {
  Bulbasaur: { name: 'Bulbasaur', evolution: [['EVO_LEVEL', '16', 'Ivysaur']] },
  Ivysaur: { name: 'Ivysaur', evolution: [['EVO_LEVEL', '36', 'Venusaur']] },
  Venusaur: { name: 'Venusaur', evolution: [['EVO_MEGA', 'ITEM_VENUSAURITE', 'Venusaur-Mega']] },
  'Venusaur-Mega': { name: 'Venusaur-Mega', evolution: [] },
  Eevee: {
    name: 'Eevee',
    evolution: [
      ['EVO_FRIENDSHIP_DAY', '0', 'Espeon'],
      ['EVO_FRIENDSHIP_NIGHT', '0', 'Umbreon'],
      ['EVO_TYPE', 'FAIRY', 'Sylveon'],
    ],
  },
  Espeon: { name: 'Espeon', evolution: [] },
  Umbreon: { name: 'Umbreon', evolution: [] },
  Sylveon: { name: 'Sylveon', evolution: [] },
  Ghost: { name: 'Ghost' }, // no evolution field at all -- must not throw
};

jest.mock('../../../game-data/loadModels', () => ({
  getModels: () => ({ species2 }),
}));

const { getPreEvolution, resetPreEvolutionCache } = require('../../../game-data/preEvolution');

describe('getPreEvolution', () => {
  beforeEach(() => resetPreEvolutionCache());

  test('root species has no pre-evolutions', () => {
    expect(getPreEvolution('Bulbasaur')).toEqual([]);
    expect(getPreEvolution('Eevee')).toEqual([]);
  });

  test('linear chain accumulates ancestors in order', () => {
    expect(getPreEvolution('Ivysaur')).toEqual(['Bulbasaur']);
    expect(getPreEvolution('Venusaur')).toEqual(['Bulbasaur', 'Ivysaur']);
  });

  test('mega evolution reuses its base form pre-evolution list, excluding the base form itself', () => {
    expect(getPreEvolution('Venusaur-Mega')).toEqual(['Bulbasaur', 'Ivysaur']);
  });

  test('branching families only attribute the true ancestor, not sibling branches', () => {
    expect(getPreEvolution('Sylveon')).toEqual(['Eevee']);
    expect(getPreEvolution('Espeon')).toEqual(['Eevee']);
    expect(getPreEvolution('Umbreon')).toEqual(['Eevee']);
  });

  test('species with no evolution field returns an empty list rather than throwing', () => {
    expect(getPreEvolution('Ghost')).toEqual([]);
  });

  test('unknown species name returns an empty list', () => {
    expect(getPreEvolution('NotARealPokemon')).toEqual([]);
  });

  test('result is cached across calls', () => {
    const first = getPreEvolution('Venusaur');
    const second = getPreEvolution('Venusaur');
    expect(first).toEqual(second);
  });
});
