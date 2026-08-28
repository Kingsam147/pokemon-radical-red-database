// Literal, fully-resolved copy of Backend/guest-starter/guestStarterService.js's
// GUEST_STARTER_PIKACHU, baked directly into the frontend so a guest's starter
// Pikachu paints on the very first render instead of waiting on a round trip to
// /public/guest-starter-pikachu. Keep in sync by hand if the backend fixture changes.
//
// allMoves is intentionally left unhydrated here — {name} stubs, not full
// PokemonMove objects — so this fixture never depends on any network data to
// render. hydrateAllMoves() upgrades those stubs to fully-resolved moves once
// the app's normal misc-data load (movesOptions, fetched for the whole app
// regardless of this Pokemon) resolves; see the call site in app/page.tsx.
import {
  Pokemon,
  PokemonType,
  PokemonForm,
  PokemonForms,
  PokemonMove,
  PokemonMoves,
  Item,
  createPokemon,
} from "@/lib/utils/types.ts"
import { POKEMON_SPRITES } from "@/lib/utils/sprites.ts"

const SPRITE = POKEMON_SPRITES("25")
const ITEM = { name: "Light Ball", spriteName: "light-ball", description: "" } as Item

const TYPE_ELECTRIC = { name: "Electric", Normal: 1, Fire: 1, Water: 1, Electric: 0.5, Grass: 1, Ice: 1, Fighting: 1, Poison: 1, Ground: 2, Flying: 0.5, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 1 } as unknown as PokemonType
const TYPE_NONE = { name: "None" } as unknown as PokemonType

const ALL_MOVE_NAMES = [
  "Baby-Doll Eyes", "Brick Break", "Dig", "Electroweb", "Facade", "Fake Out",
  "Flash", "Growl", "Iron Tail", "Light Screen", "Play Rough", "Reflect",
  "Rest", "Return", "Sleep Talk", "Tail Whip", "Thief", "Thunder Punch",
  "Thunder Shock", "Thunderbolt", "Volt Switch",
]

const ALL_MOVES: PokemonMove[] = ALL_MOVE_NAMES.map((name) => ({ name }))

export function hydrateAllMoves(pokemon: Pokemon, movesList: PokemonMoves): Pokemon {
  const resolvedAllMoves = pokemon.allMoves.map((m) => movesList[m.name.toLowerCase().replaceAll(/[^a-z0-9]/g, "")] ?? m)
  return {
    ...pokemon,
    allMoves: resolvedAllMoves,
    forms: {
      ...pokemon.forms,
      Pikachu: { ...pokemon.forms.Pikachu, allMoves: resolvedAllMoves },
    },
  }
}

const MOVESET = [
  { name: "Thunder Shock", num: 84, accuracy: 100, basePower: 40, category: "Special", pp: 30, priority: 0, type: "Electric", target: "normal", secondary: { chance: 10, status: "par" }, shortDesc: "10% chance to paralyze the target." },
  { name: "Fake Out", num: 252, accuracy: 100, basePower: 40, category: "Physical", pp: 5, priority: 3, type: "Normal", target: "normal", secondary: { chance: 100, volatileStatus: "flinch" }, shortDesc: "Hits first. First turn out only. 100% flinch chance." },
  { name: "Baby-Doll Eyes", num: 608, accuracy: 100, basePower: 0, category: "Status", pp: 30, priority: 1, type: "Fairy", target: "normal", boosts: { atk: -1 }, secondary: null, shortDesc: "Lowers the target's Attack by 1." },
  { name: "Tail Whip", num: 39, accuracy: 100, basePower: 0, category: "Status", pp: 30, priority: 0, type: "Normal", target: "allAdjacentFoes", boosts: { def: -1 }, secondary: null, shortDesc: "Lowers the foe(s) Defense by 1." },
] as PokemonMove[]

const BASE_STATS = { HP: 35, Atk: 55, Def: 40, SpA: 50, SpD: 50, Spe: 90 }
const FINAL_STATS = { HP: 26, Atk: 23, Def: 13, SpA: 15, SpD: 13, Spe: 26 }
const ABILITY = { name: "Lightning Rod", description: "", toggle: false, toggledOn: false }

const PIKACHU_FORM: PokemonForm = {
  formName: "Pikachu",
  ID: 25,
  sprite: SPRITE,
  type1: TYPE_ELECTRIC,
  type2: TYPE_NONE,
  types: [TYPE_ELECTRIC],
  ability: ABILITY,
  abilities: [
    { name: "Static", description: "", toggle: false, toggledOn: false },
    ABILITY,
  ],
  baseStats: BASE_STATS,
  finalStats: FINAL_STATS,
  allMoves: ALL_MOVES,
}

const FORMS: PokemonForms = { Pikachu: PIKACHU_FORM }

export const GUEST_STARTER_PIKACHU_FIXTURE: Pokemon = createPokemon(
  "Pikachu",
  "25",
  SPRITE,
  TYPE_ELECTRIC,
  TYPE_NONE,
  5,
  { name: "Naughty", increase: "Atk", decrease: "SpD" },
  ITEM,
  ABILITY,
  [
    { name: "Static", description: "", toggle: false, toggledOn: false },
    ABILITY,
  ],
  BASE_STATS,
  { HP: 0, Atk: 252, Def: 0, SpA: 0, SpD: 0, Spe: 252 },
  { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
  FINAL_STATS.HP,
  FINAL_STATS,
  MOVESET,
  ALL_MOVES,
  PIKACHU_FORM,
  FORMS,
  "M",
  false,
  { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 }
)
