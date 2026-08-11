const BoxEntity = require('../../../boxes/BoxEntity');
const PokemonEntity = require('../../../pokemon/PokemonEntity');

const makePokemon = (name) =>
  PokemonEntity.create({
    name,
    form: name,
    gender: 'N',
    level: 50,
    nature: 'Hardy',
    item: '',
    ability_id: 'Levitate',
    move_ids: [],
    EVs: { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
    IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
    player: 1,
  });

describe('BoxEntity', () => {
  test('starts empty and reports size 0', () => {
    const box = new BoxEntity();
    expect(box.size).toBe(0);
    expect(box.hasPokemon('Ditto')).toBe(false);
  });

  test('addPokemon adds and getPokemon retrieves it', () => {
    const box = new BoxEntity();
    const ditto = makePokemon('Ditto');
    box.addPokemon(ditto);
    expect(box.hasPokemon('Ditto')).toBe(true);
    expect(box.getPokemon('Ditto')).toBe(ditto);
    expect(box.size).toBe(1);
  });

  test('addPokemon throws on duplicate name', () => {
    const box = new BoxEntity();
    box.addPokemon(makePokemon('Ditto'));
    expect(() => box.addPokemon(makePokemon('Ditto'))).toThrow(
      'Ditto already exists in this box',
    );
  });

  test('removePokemon deletes and returns the removed entity, or null if absent', () => {
    const box = new BoxEntity();
    const ditto = makePokemon('Ditto');
    box.addPokemon(ditto);
    expect(box.removePokemon('Ditto')).toBe(ditto);
    expect(box.hasPokemon('Ditto')).toBe(false);
    expect(box.removePokemon('Ditto')).toBeNull();
  });

  test('updatePokemon replaces an existing entry, throws if missing', () => {
    const box = new BoxEntity();
    box.addPokemon(makePokemon('Ditto'));
    const replacement = makePokemon('Ditto');
    box.updatePokemon('Ditto', replacement);
    expect(box.getPokemon('Ditto')).toBe(replacement);
    expect(() => box.updatePokemon('Mew', makePokemon('Mew'))).toThrow(
      "Mew doesn't exist in this box",
    );
  });

  test('clear empties the box', () => {
    const box = new BoxEntity([makePokemon('Ditto'), makePokemon('Mew')]);
    box.clear();
    expect(box.size).toBe(0);
  });

  test('listPokemon returns all entities', () => {
    const box = new BoxEntity([makePokemon('Ditto'), makePokemon('Mew')]);
    expect(box.listPokemon().map((p) => p.name)).toEqual(['Ditto', 'Mew']);
  });

  test('toJSON produces a name-keyed dict of lean shapes', () => {
    const box = new BoxEntity([makePokemon('Ditto')]);
    expect(box.toJSON()).toEqual({ Ditto: makePokemon('Ditto').toJSON() });
  });

  test('fromStoredDoc reconstructs a box from a stored name-keyed doc', () => {
    const models = { natures: {}, items: {} };
    const doc = { Ditto: makePokemon('Ditto').toJSON() };
    const box = BoxEntity.fromStoredDoc(doc, models);
    expect(box.hasPokemon('Ditto')).toBe(true);
  });
});
