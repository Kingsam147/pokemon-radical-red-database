import {Pokemon, PokemonType} from "@/lib/utils/types.ts";

export const formatPokemonForAPI = (pokemon: Pokemon) => ({
  name: pokemon.name,
  level: pokemon.level,
  item: pokemon.item.name,
  nature: pokemon.nature.name,
  evs: {
    hp: pokemon.EVs.HP,
    atk: pokemon.EVs.Atk,
    def: pokemon.EVs.Def,
    spa: pokemon.EVs.SpA,
    spd: pokemon.EVs.SpD,
    spe: pokemon.EVs.Spe
  },
  ivs: {
    hp: pokemon.IVs.HP,
    atk: pokemon.IVs.Atk,
    def: pokemon.IVs.Def,
    spa: pokemon.IVs.SpA,
    spd: pokemon.IVs.SpD,
    spe: pokemon.IVs.Spe
  },
  boosts: {
    atk: pokemon.statBoosts?.Atk || 0,
    def: pokemon.statBoosts?.Def || 0,
    spa: pokemon.statBoosts?.SpA || 0,
    spd: pokemon.statBoosts?.SpD || 0,
    spe: pokemon.statBoosts?.Spe || 0
  },
  ability: pokemon.ability.name,
  abilityOn: pokemon.ability.toggle,
  status: pokemon.status,
  currentHP: pokemon.currentHp,
  maxHP: pokemon.maxHp, 
  gender: pokemon.gender
});

export const getTypeColor = (type: PokemonType): string => {
  const colors: Record<string, string> = {
    Normal: "#A8A878",
    Fire: "#F08030",
    Water: "#6890F0",
    Electric: "#F8D030",
    Grass: "#78C850",
    Ice: "#98D8D8",
    Fighting: "#C03028",
    Poison: "#A040A0",
    Ground: "#E0C068",
    Flying: "#A890F0",
    Psychic: "#F85888",
    Bug: "#A8B820",
    Rock: "#B8A038",
    Ghost: "#705898",
    Dragon: "#7038F8",
    Dark: "#705848",
    Steel: "#B8B8D0",
    Fairy: "#EE99AC",
  }
  return colors[type.name] || "#A8A878"
}

export const getStatusStyle = (status: string): string => {
  const styles: Record<string, string> = {
    Healthy:        "bg-green-100 text-green-800",
    Burn:           "bg-red-200 text-red-900",
    Freeze:         "bg-blue-200 text-blue-900",
    Paralysis:      "bg-yellow-200 text-yellow-900",
    Poison:         "bg-purple-200 text-purple-900",
    "Badly Poison": "bg-[#800080] text-white",
    Sleep:          "bg-gray-300 text-gray-1000",
    Fainted:        "bg-gray-700 text-white",
  };
  return styles[status] ?? "bg-gray-100 text-gray-700";
};