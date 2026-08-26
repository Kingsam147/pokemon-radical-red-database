
const { Generations } = require('@smogon/calc');

const gen = Generations.get(9);

const items = [...gen.items].map(i => i.name);
const abilities = [...gen.abilities].map(a => a.name);
const normalSpecies = [...gen.species].map(s => s.name);

module.exports = { items, abilities, normalSpecies };
