// Literal, fully-resolved copy of Backend/enemy-preview/enemyPreviewService.js's
// HARDCODED_BULBASAUR, baked directly into the frontend so the enemy preview
// paints on the very first render instead of waiting on a round trip to
// /public/enemy-preview. Keep in sync by hand if the backend fixture changes.
import {
  Pokemon,
  PokemonType,
  PokemonForm,
  PokemonForms,
  PokemonMove,
  Item,
  Team,
  TrainerInfo,
  createPokemon,
} from "@/lib/utils/types.ts"
import { POKEMON_SPRITES } from "@/lib/utils/sprites.ts"

const SPRITE = POKEMON_SPRITES("1")
const ITEM = { name: "None", spriteName: "none", description: "" } as Item

const TYPE_GRASS = { name: "Grass", Normal: 1, Fire: 2, Water: 0.5, Electric: 0.5, Grass: 0.5, Ice: 2, Fighting: 1, Poison: 2, Ground: 0.5, Flying: 2, Psychic: 1, Bug: 2, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 1, Fairy: 1 } as unknown as PokemonType
const TYPE_POISON = { name: "Poison", Normal: 1, Fire: 1, Water: 1, Electric: 1, Grass: 0.5, Ice: 1, Fighting: 0.5, Poison: 0.5, Ground: 2, Flying: 1, Psychic: 2, Bug: 0.5, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 1, Fairy: 0.5 } as unknown as PokemonType

const MOVESET = [
  { name: "Tackle", num: 33, accuracy: 100, basePower: 40, category: "Physical", pp: 35, priority: 0, type: "Normal", target: "normal", secondary: null, shortDesc: "No additional effect." },
  { name: "Growl", num: 45, accuracy: 100, basePower: 0, category: "Status", pp: 40, priority: 0, type: "Normal", target: "allAdjacentFoes", boosts: { atk: -1 }, secondary: null, shortDesc: "Lowers the foe(s) Attack by 1." },
] as PokemonMove[]

const BASE_STATS = { HP: 45, Atk: 49, Def: 49, SpA: 65, SpD: 65, Spe: 45 }
const FINAL_STATS = { HP: 21, Atk: 11, Def: 11, SpA: 13, SpD: 13, Spe: 11 }
const ABILITY = { name: "Overgrow", description: "", toggle: false, toggledOn: false }

const BULBASAUR_FORM: PokemonForm = {
  formName: "Bulbasaur",
  ID: 1,
  sprite: SPRITE,
  type1: TYPE_GRASS,
  type2: TYPE_POISON,
  types: [TYPE_GRASS, TYPE_POISON],
  ability: ABILITY,
  abilities: [
    ABILITY,
    { name: "Chlorophyll", description: "", toggle: false, toggledOn: false },
  ],
  baseStats: BASE_STATS,
  finalStats: FINAL_STATS,
  allMoves: [],
}

const FORMS: PokemonForms = { Bulbasaur: BULBASAUR_FORM }

const BULBASAUR_FIXTURE: Pokemon = createPokemon(
  "Bulbasaur",
  "1",
  SPRITE,
  TYPE_GRASS,
  TYPE_POISON,
  5,
  { name: "Bashful", increase: "Spe", decrease: "Spe" },
  ITEM,
  ABILITY,
  [
    ABILITY,
    { name: "Chlorophyll", description: "", toggle: false, toggledOn: false },
  ],
  BASE_STATS,
  { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
  { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
  FINAL_STATS.HP,
  FINAL_STATS,
  MOVESET,
  [],
  BULBASAUR_FORM,
  FORMS,
  "Both",
  false,
  { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 }
)

const TRAINER_INFO: TrainerInfo = {
  name: "Rival Gary - Pallet Town (Bulbasuar)",
  rules: "",
  format: "Singles",
  partner: "",
  myPartner: "",
}

const ENEMY_PREVIEW_TEAM: Team = {
  Bulbasaur: BULBASAUR_FIXTURE,
  trainerInfo: TRAINER_INFO,
}

export const ENEMY_PREVIEW_FIXTURE = {
  teamName: TRAINER_INFO.name,
  team: ENEMY_PREVIEW_TEAM,
}
