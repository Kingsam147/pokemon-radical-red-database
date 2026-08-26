const { getModels } = require('./loadModels');

let preEvolutionCache = null;

// Mega evolution is a same-stage form change, not a generational step -- Venusaur-Mega
// reuses Venusaur's own preEvolution list ([Bulbasaur, Ivysaur]) rather than adding
// Venusaur itself as an "ancestor" of its own mega form.
const REUSE_PARENT_LIST_METHODS = new Set(['EVO_MEGA']);

const buildPreEvolutionMap = () => {
  const { species2 } = getModels();
  const parentEdge = new Map();

  Object.values(species2).forEach((species) => {
    if (!Array.isArray(species.evolution)) return;
    species.evolution.forEach(([method, , targetName]) => {
      if (targetName) parentEdge.set(targetName, { parentName: species.name, method });
    });
  });

  const resolved = new Map();

  const resolve = (speciesName) => {
    if (resolved.has(speciesName)) return resolved.get(speciesName);
    resolved.set(speciesName, []);

    const edge = parentEdge.get(speciesName);
    if (!edge) return [];

    const parentChain = resolve(edge.parentName);
    const chain = REUSE_PARENT_LIST_METHODS.has(edge.method)
      ? parentChain
      : [...parentChain, edge.parentName];

    resolved.set(speciesName, chain);
    return chain;
  };

  Object.keys(species2).forEach(resolve);
  return resolved;
};

const getPreEvolution = (speciesName) => {
  if (!preEvolutionCache) preEvolutionCache = buildPreEvolutionMap();
  return preEvolutionCache.get(speciesName) ?? [];
};

const resetPreEvolutionCache = () => {
  preEvolutionCache = null;
};

module.exports = { getPreEvolution, resetPreEvolutionCache };
