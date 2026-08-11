const PokemonEntity = require('../pokemon/PokemonEntity');

class TeamEntity {
  #pokemon;
  #trainerInfo;

  constructor(pokemonEntities = [], trainerInfo = undefined) {
    if (!Array.isArray(pokemonEntities))
      throw new Error('pokemonEntities must be an array of PokemonEntity instances');
    if (trainerInfo !== undefined && (trainerInfo === null || typeof trainerInfo !== 'object'))
      throw new Error('trainerInfo must be an object');

    this.#pokemon = new Map();
    pokemonEntities.forEach((entity, index) => {
      if (!(entity instanceof PokemonEntity))
        throw new Error(`pokemonEntities[${index}] must be a PokemonEntity instance`);
      this.addPokemon(entity);
    });
    this.#trainerInfo = trainerInfo;
  }

  get size() {
    return this.#pokemon.size;
  }

  get trainerInfo() {
    return this.#trainerInfo;
  }

  hasPokemon(name) {
    return this.#pokemon.has(name);
  }

  getPokemon(name) {
    const entity = this.#pokemon.get(name);
    return entity === undefined ? null : entity;
  }

  listPokemon() {
    return Array.from(this.#pokemon.values());
  }

  addPokemon(entity) {
    if (!(entity instanceof PokemonEntity)) throw new Error('entity must be a PokemonEntity');
    if (this.#pokemon.has(entity.name)) {
      const error = new Error(`${entity.name} already exists in this team`);
      error.code = 'DUPLICATE_POKEMON';
      throw error;
    }
    this.#pokemon.set(entity.name, entity);
  }

  removePokemon(name) {
    const entity = this.#pokemon.get(name);
    if (entity === undefined) return null;
    this.#pokemon.delete(name);
    return entity;
  }

  updatePokemon(name, entity) {
    if (!this.#pokemon.has(name)) {
      const error = new Error(`${name} doesn't exist in this team`);
      error.code = 'NOT_FOUND';
      throw error;
    }
    if (!(entity instanceof PokemonEntity)) throw new Error('entity must be a PokemonEntity');
    if (entity.name !== name && this.#pokemon.has(entity.name)) {
      const error = new Error(`${entity.name} already exists in this team`);
      error.code = 'DUPLICATE_POKEMON';
      throw error;
    }
    this.#pokemon.delete(name);
    this.#pokemon.set(entity.name, entity);
  }

  clear() {
    this.#pokemon.clear();
  }

  toJSON() {
    const json = {};
    this.#pokemon.forEach((entity, name) => {
      json[name] = entity.toJSON();
    });
    if (this.#trainerInfo !== undefined) json.trainerInfo = this.#trainerInfo;
    return json;
  }

  static fromStoredDoc(doc, models) {
    const source = doc === undefined || doc === null ? {} : doc;
    const entities = Object.keys(source)
      .filter((name) => name !== 'trainerInfo')
      .map((name) => PokemonEntity.fromStoredDoc(source[name], models));
    return new TeamEntity(entities, source.trainerInfo);
  }
}

module.exports = TeamEntity;
