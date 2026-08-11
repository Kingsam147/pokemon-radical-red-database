const TeamEntity = require('../../../teams/TeamEntity');
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

describe('TeamEntity', () => {
  test('starts empty with undefined trainerInfo by default', () => {
    const team = new TeamEntity();
    expect(team.size).toBe(0);
    expect(team.trainerInfo).toBeUndefined();
  });

  test('constructor accepts trainerInfo', () => {
    const team = new TeamEntity([], { name: 'Blue' });
    expect(team.trainerInfo).toEqual({ name: 'Blue' });
  });

  test('addPokemon/getPokemon/hasPokemon round-trip', () => {
    const team = new TeamEntity();
    const ditto = makePokemon('Ditto');
    team.addPokemon(ditto);
    expect(team.hasPokemon('Ditto')).toBe(true);
    expect(team.getPokemon('Ditto')).toBe(ditto);
  });

  test('addPokemon throws on duplicate', () => {
    const team = new TeamEntity();
    team.addPokemon(makePokemon('Ditto'));
    expect(() => team.addPokemon(makePokemon('Ditto'))).toThrow(
      'Ditto already exists in this team',
    );
  });

  test('addPokemon throws a clear error for null or non-entity values', () => {
    const team = new TeamEntity();
    expect(() => team.addPokemon(null)).toThrow('entity must be a PokemonEntity');
    expect(() => team.addPokemon({ name: 'Ditto' })).toThrow('entity must be a PokemonEntity');
  });

  test('constructor throws the same duplicate-name error as addPokemon', () => {
    expect(() => new TeamEntity([makePokemon('Ditto'), makePokemon('Ditto')])).toThrow(
      'Ditto already exists in this team',
    );
  });

  test('constructor error message identifies the offending array index', () => {
    expect(() => new TeamEntity([makePokemon('Ditto'), null])).toThrow(
      'pokemonEntities[1] must be a PokemonEntity instance',
    );
  });

  test('removePokemon deletes and returns, or null if absent', () => {
    const team = new TeamEntity();
    const ditto = makePokemon('Ditto');
    team.addPokemon(ditto);
    expect(team.removePokemon('Ditto')).toBe(ditto);
    expect(team.removePokemon('Ditto')).toBeNull();
  });

  test('updatePokemon replaces an existing entry, throws if missing', () => {
    const team = new TeamEntity();
    team.addPokemon(makePokemon('Ditto'));
    const replacement = makePokemon('Ditto');
    team.updatePokemon('Ditto', replacement);
    expect(team.getPokemon('Ditto')).toBe(replacement);
    expect(() => team.updatePokemon('Mew', makePokemon('Mew'))).toThrow(
      "Mew doesn't exist in this team",
    );
  });

  test('updatePokemon throws when renaming to a name already used by another entry', () => {
    const team = new TeamEntity([makePokemon('Ditto'), makePokemon('Mew')]);
    const renamedToMew = makePokemon('Mew');
    expect(() => team.updatePokemon('Ditto', renamedToMew)).toThrow(
      'Mew already exists in this team',
    );
    expect(team.getPokemon('Ditto')).not.toBeNull();
    expect(team.getPokemon('Mew').name).toBe('Mew');
  });

  test('updatePokemon throws a clear error for null or non-entity values', () => {
    const team = new TeamEntity();
    team.addPokemon(makePokemon('Ditto'));
    expect(() => team.updatePokemon('Ditto', null)).toThrow('entity must be a PokemonEntity');
    expect(() => team.updatePokemon('Ditto', { name: 'Ditto' })).toThrow(
      'entity must be a PokemonEntity',
    );
  });

  test('updatePokemon reports missing-key error before the instanceof check', () => {
    const team = new TeamEntity();
    expect(() => team.updatePokemon('Missing', null)).toThrow(
      "Missing doesn't exist in this team",
    );
  });

  test('clear empties the team', () => {
    const team = new TeamEntity([makePokemon('Ditto'), makePokemon('Mew')]);
    team.clear();
    expect(team.size).toBe(0);
  });

  test('listPokemon returns all entities as a fresh array, not a live view', () => {
    const team = new TeamEntity([makePokemon('Ditto'), makePokemon('Mew')]);
    const list = team.listPokemon();
    expect(list.map((entity) => entity.name)).toEqual(['Ditto', 'Mew']);
    list.push(makePokemon('Mewtwo'));
    expect(team.size).toBe(2);
    expect(team.listPokemon()).toHaveLength(2);
  });

  test('toJSON includes trainerInfo only when set', () => {
    const withInfo = new TeamEntity([makePokemon('Ditto')], { name: 'Blue' });
    expect(withInfo.toJSON()).toEqual({
      Ditto: makePokemon('Ditto').toJSON(),
      trainerInfo: { name: 'Blue' },
    });

    const withoutInfo = new TeamEntity([makePokemon('Ditto')]);
    expect(withoutInfo.toJSON()).toEqual({ Ditto: makePokemon('Ditto').toJSON() });
  });

  test('fromStoredDoc separates trainerInfo from the pokemon entries', () => {
    const models = { natures: {}, items: {} };
    const doc = { Ditto: makePokemon('Ditto').toJSON(), trainerInfo: { name: 'Blue' } };
    const team = TeamEntity.fromStoredDoc(doc, models);
    expect(team.hasPokemon('Ditto')).toBe(true);
    expect(team.trainerInfo).toEqual({ name: 'Blue' });
  });

  test('fromStoredDoc handles a null/undefined doc as an empty team', () => {
    const team = TeamEntity.fromStoredDoc(undefined, { natures: {}, items: {} });
    expect(team.size).toBe(0);
  });
});
