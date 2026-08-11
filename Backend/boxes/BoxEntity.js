const PokemonEntity = require('../pokemon/PokemonEntity');

class BoxEntity {
  #pokemon;

  constructor(pokemonEntities = []) {
    if (!Array.isArray(pokemonEntities))
      throw new Error('pokemonEntities must be an array of PokemonEntity instances');

    this.#pokemon = new Map();
    pokemonEntities.forEach((entity, index) => {
      if (!(entity instanceof PokemonEntity))
        throw new Error(`pokemonEntities[${index}] must be a PokemonEntity instance`);
      this.addPokemon(entity);
    });
  }

  get size() {
    return this.#pokemon.size;
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
      const error = new Error(`${entity.name} already exists in this box`);
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
      const error = new Error(`${name} doesn't exist in this box`);
      error.code = 'NOT_FOUND';
      throw error;
    }
    if (!(entity instanceof PokemonEntity)) throw new Error('entity must be a PokemonEntity');
    if (entity.name !== name && this.#pokemon.has(entity.name)) {
      const error = new Error(`${entity.name} already exists in this box`);
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
    return json;
  }

  static fromStoredDoc(doc, models) {
    const source = doc === undefined || doc === null ? {} : doc;
    const entities = Object.keys(source).map((name) =>
      PokemonEntity.fromStoredDoc(source[name], models),
    );
    return new BoxEntity(entities);
  }
}

module.exports = BoxEntity;
