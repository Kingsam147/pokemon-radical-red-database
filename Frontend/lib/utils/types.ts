// backend stuff
export type teamPayload = {
  "teamName": string
}

export type pokemonPayload = {
  "pokemonData": string
}

export interface PokemonStats {
  HP: number
  Atk: number
  Def: number
  SpA: number
  SpD: number
  Spe: number
}

export type PokemonStat = "HP" | "Atk" | "Def" | "SpA" | "SpD" | "Spe";

export type Gender = "M" | "F" | "Both" | "N";

export interface Pokemon {
  name: string
  form: PokemonForm
  ID: string
  sprite: string
  type1 : PokemonType
  type2 : PokemonType
  types: PokemonType[]
  forms: PokemonForms
  level: number
  nature: Nature
  item: Item
  ability: Ability
  abilities: Ability[]
  baseStats: PokemonStats
  EVs: PokemonStats
  IVs: PokemonStats
  maxHp: number
  currentHp: number
  finalStats: PokemonStats
  statBoosts?: Partial<PokemonStats>
  moveset: PokemonMove[]
  allMoves: PokemonMove[]
  gender: Gender
  femaleSprite: boolean
  status: PokemonStatus
  switchInScore: number
  weaknesses?: string[] // Types with 2x damage
  doubleWeaknesses?: string[] // Types with 4x damage
  resistances?: string[] // Types with 0.5x damage
  doubleResistances?: string[] // Types with 0.25x damage
  immunities?: string[] // Types with 0x damage
  boxKey?: string
  boxIndex?: number
}

export function createPokemon(
  name: string,
  ID: string,
  sprite: string,
  type1: PokemonType,
  type2: PokemonType,
  level: number,
  nature: Nature,
  item: Item,
  ability: Ability,
  abilities: Ability[],
  baseStats: PokemonStats,
  EVs: PokemonStats,
  IVs: PokemonStats,
  maxHp: number,
  finalStats: PokemonStats,
  moveset: PokemonMove[],
  allMoves: PokemonMove[],
  form: PokemonForm,
  forms: PokemonForms,
  gender: Gender,
  femaleSprite: boolean, 
  statBoosts: Partial<PokemonStats>,
  status: PokemonStatus = { name: "Healthy", description: []}

): Pokemon {

  return {
    ID,
    name,
    gender,
    form,
    level,
    maxHp,
    'currentHp': maxHp,
    nature,
    item,
    ability,
    abilities,
    baseStats,
    IVs,
    EVs,
    statBoosts,
    finalStats,
    moveset,
    allMoves,
    sprite,
    femaleSprite,
    type1, 
    type2,
    types: type2.name !== "None" ? [type1, type2] : [type1],
    forms,
    status,
    switchInScore: 0
  }
  
}

export interface TurnData {
  turnNumber: number
  player1Hp: number
  player2Hp: number
  action: string
}

export interface Box {
  [key: string]: Pokemon | null
}

export interface TrainerInfo {
  name: string, 
  rules: string, 
  format: string, 
  partner: string, 
  myPartner: string
}

export interface Team {
  [key: string]: Pokemon | TrainerInfo | null;
}

export interface Teams {
  [key: string]: Team
}

export interface Item {
  name: string
}

export interface Items {
  [key: string]: Item
}

export interface Nature {
  name: string, 
  increase: PokemonStat, 
  decrease: PokemonStat
}

export interface Natures {
  [key: string]: Nature
}

export interface PokemonType {
  name: string, 
  Normal: number, 
  Fire: number, 
  Water: number, 
  Eletric: number, 
  Grass: number, 
  Ice: number, 
  Fighting: number, 
  Poison: number, 
  Ground: number, 
  Flying: number, 
  Psychic: number, 
  Bug: number, 
  Rock: number, 
  Ghost: number, 
  Dragon: number, 
  Dark: number, 
  Steel: number, 
  Fairy: number 
}

export interface PokemonTypes {
  [key: string]: PokemonType
}

export interface Ability {
  name: string, 
  description: string, 
  toggle: boolean, 
  toggledOn: boolean
}

export interface Abilities {
  [key: string]: Ability
}

export interface PokemonMove {
  name: string,
  [key: string]: any
}

export interface PokemonMoves {
  [key: string]: PokemonMove
}

export interface PokemonForm {
  formName: string 
  ID: number
  sprite: string
  type1: PokemonType, 
  type2: PokemonType
  types: PokemonType[]
  ability: Ability
  abilities: Ability[]
  baseStats: PokemonStats 
  finalStats: PokemonStats
  allMoves: PokemonMove[]
}

export interface PokemonForms {
  [key: string]: PokemonForm
}

// Shape of a Pokemon entry as it arrives from the backend, before misc
// reference data (abilities/items/natures/types/moves) has been resolved —
// fields may still be raw string keys or already-resolved objects.
export interface RawPokemonForm {
  formName: string
  ID: number
  baseStats: PokemonStats
  finalStats: PokemonStats
  ability: string | Ability
  abilities: (string | Ability)[]
  allMoves: (string | PokemonMove)[]
  type1: string | PokemonType
  type2: string | PokemonType
  sprite?: string
}

export interface RawPokemon {
  name: string
  ID: string | number
  sprite?: string
  type1: string | PokemonType
  type2: string | PokemonType
  level: number
  nature: string | Nature
  item: string | Item
  ability: string | Ability
  abilities: (string | Ability)[]
  baseStats: PokemonStats
  EVs: PokemonStats
  IVs: PokemonStats
  finalStats: PokemonStats
  moveset: (string | PokemonMove)[]
  allMoves: (string | PokemonMove)[]
  form: string | PokemonForm
  forms: Record<string, RawPokemonForm>
  gender: Gender
  femaleSprite: boolean
  statBoosts?: Partial<PokemonStats> | null
}

export interface RawTeam {
  [key: string]: RawPokemon | TrainerInfo | null
}

export interface PokemonStatus {
  name: string, 
  description: string[]
}

export interface PokemonStatuses {
  [key: string] : PokemonStatus
}