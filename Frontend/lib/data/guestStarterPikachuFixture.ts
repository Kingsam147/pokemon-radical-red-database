// Literal, fully-resolved copy of Backend/guest-starter/guestStarterService.js's
// GUEST_STARTER_PIKACHU, baked directly into the frontend so a guest's starter
// Pikachu paints on the very first render instead of waiting on a round trip to
// /public/guest-starter-pikachu. Keep in sync by hand if the backend fixture changes.
import {
  Pokemon,
  PokemonType,
  PokemonForm,
  PokemonForms,
  PokemonMove,
  Item,
  createPokemon,
} from "@/lib/utils/types.ts"
import { POKEMON_SPRITES } from "@/lib/utils/sprites.ts"

const SPRITE = POKEMON_SPRITES("25")
const ITEM = { name: "Light Ball", spriteName: "light-ball", description: "" } as Item

const TYPE_ELECTRIC = { name: "Electric", Normal: 1, Fire: 1, Water: 1, Electric: 0.5, Grass: 1, Ice: 1, Fighting: 1, Poison: 1, Ground: 2, Flying: 0.5, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 1 } as unknown as PokemonType
const TYPE_NONE = { name: "None" } as unknown as PokemonType

const ALL_MOVES = [
  { name: "Baby-Doll Eyes", num: 608, accuracy: 100, basePower: 0, category: "Status", pp: 30, priority: 1, type: "Fairy", target: "normal", secondary: null, shortDesc: "Lowers the target's Attack by 1." },
  { name: "Brick Break", num: 280, accuracy: 100, basePower: 75, category: "Physical", pp: 15, priority: 0, type: "Fighting", target: "normal", secondary: null, shortDesc: "Destroys screens, unless the target is immune." },
  { name: "Dig", num: 91, accuracy: 100, basePower: 80, category: "Physical", pp: 10, priority: 0, type: "Ground", target: "normal", secondary: null, shortDesc: "Digs underground turn 1, strikes turn 2." },
  { name: "Electroweb", num: 527, accuracy: 100, basePower: 55, category: "Special", pp: 15, priority: 0, type: "Electric", target: "allAdjacentFoes", secondary: { chance: 100, boosts: { spe: -1 } }, shortDesc: "100% chance to lower the foe(s) Speed by 1." },
  { name: "Facade", num: 263, accuracy: 100, basePower: 70, category: "Physical", pp: 20, priority: 0, type: "Normal", target: "normal", secondary: null, shortDesc: "Power doubles if user is burn/poison/paralyzed." },
  { name: "Fake Out", num: 252, accuracy: 100, basePower: 40, category: "Physical", pp: 5, priority: 3, type: "Normal", target: "normal", secondary: { chance: 100, volatileStatus: "flinch" }, shortDesc: "Hits first. First turn out only. 100% flinch chance." },
  { name: "Flash", num: 148, accuracy: 100, basePower: 60, category: "Status", pp: 20, priority: 0, type: "Electric", target: "normal", secondary: { chance: 50, boosts: { att: -1 } }, shortDesc: "50% change to lower enemy Att by one stage" },
  { name: "Growl", num: 45, accuracy: 100, basePower: 0, category: "Status", pp: 40, priority: 0, type: "Normal", target: "allAdjacentFoes", secondary: null, shortDesc: "Lowers the foe(s) Attack by 1." },
  { name: "Iron Tail", num: 231, accuracy: 75, basePower: 100, category: "Physical", pp: 15, priority: 0, type: "Steel", target: "normal", secondary: { chance: 30, boosts: { def: -1 } }, shortDesc: "30% chance to lower the target's Defense by 1." },
  { name: "Light Screen", num: 113, accuracy: true, basePower: 0, category: "Status", pp: 30, priority: 0, type: "Psychic", target: "allySide", secondary: null, shortDesc: "For 5 turns, special damage to allies is halved." },
  { name: "Play Rough", num: 583, accuracy: 100, basePower: 90, category: "Physical", pp: 10, priority: 0, type: "Fairy", target: "normal", secondary: { chance: 10, boosts: { atk: -1 } }, shortDesc: "10% chance to lower the target's Attack by 1." },
  { name: "Reflect", num: 115, accuracy: true, basePower: 0, category: "Status", pp: 20, priority: 0, type: "Psychic", target: "allySide", secondary: null, shortDesc: "For 5 turns, physical damage to allies is halved." },
  { name: "Rest", num: 156, accuracy: true, basePower: 0, category: "Status", pp: 5, priority: 0, type: "Psychic", target: "self", secondary: null, shortDesc: "User sleeps 2 turns and restores HP and status." },
  { name: "Return", num: 216, accuracy: 100, basePower: 0, category: "Physical", pp: 20, priority: 0, type: "Normal", target: "normal", secondary: null, shortDesc: "Max 102 power at maximum Happiness." },
  { name: "Sleep Talk", num: 214, accuracy: true, basePower: 0, category: "Status", pp: 10, priority: 0, type: "Normal", target: "self", secondary: null, shortDesc: "User must be asleep. Uses another known move." },
  { name: "Tail Whip", num: 39, accuracy: 100, basePower: 0, category: "Status", pp: 30, priority: 0, type: "Normal", target: "allAdjacentFoes", secondary: null, shortDesc: "Lowers the foe(s) Defense by 1." },
  { name: "Thief", num: 168, accuracy: 100, basePower: 60, category: "Physical", pp: 25, priority: 0, type: "Dark", target: "normal", secondary: null, shortDesc: "If the user has no item, it steals the target's." },
  { name: "Thunder Punch", num: 9, accuracy: 100, basePower: 75, category: "Physical", pp: 15, priority: 0, type: "Electric", target: "normal", secondary: { chance: 10, status: "par" }, shortDesc: "10% chance to paralyze the target." },
  { name: "Thunder Shock", num: 84, accuracy: 100, basePower: 40, category: "Special", pp: 30, priority: 0, type: "Electric", target: "normal", secondary: { chance: 10, status: "par" }, shortDesc: "10% chance to paralyze the target." },
  { name: "Thunderbolt", num: 85, accuracy: 100, basePower: 90, category: "Special", pp: 15, priority: 0, type: "Electric", target: "normal", secondary: { chance: 10, status: "par" }, shortDesc: "10% chance to paralyze the target." },
  { name: "Volt Switch", num: 521, accuracy: 100, basePower: 70, category: "Special", pp: 20, priority: 0, type: "Electric", target: "normal", secondary: null, shortDesc: "User switches out after damaging the target." },
] as PokemonMove[]

const MOVESET = [
  { name: "Volt Tackle", num: 344, accuracy: 100, basePower: 120, category: "Physical", pp: 15, priority: 0, type: "Electric", target: "normal", secondary: { chance: 10, status: "par" }, shortDesc: "Has 33% recoil. 10% chance to paralyze target." },
  { name: "Thunderbolt", num: 85, accuracy: 100, basePower: 90, category: "Special", pp: 15, priority: 0, type: "Electric", target: "normal", secondary: { chance: 10, status: "par" }, shortDesc: "10% chance to paralyze the target." },
  { name: "Iron Tail", num: 231, accuracy: 75, basePower: 100, category: "Physical", pp: 15, priority: 0, type: "Steel", target: "normal", secondary: { chance: 30, boosts: { def: -1 } }, shortDesc: "30% chance to lower the target's Defense by 1." },
  { name: "Quick Attack", num: 98, accuracy: 100, basePower: 40, category: "Physical", pp: 30, priority: 1, type: "Normal", target: "normal", secondary: null, shortDesc: "Usually goes first." },
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
