import {
  Pokemon,
  RawPokemon,
  PokemonType,
  Nature,
  Item,
  Ability,
  PokemonMove,
  PokemonForm,
  PokemonForms,
  createPokemon,
} from "@/lib/utils/types.ts"
import apiClient from "@/lib/infrastructure/apiClient"

async function fetchGuestStarterPikachu(): Promise<RawPokemon | null> {
  try {
    const res = await apiClient.get("/public/guest-starter-pikachu")
    return res.data.pokemon
  } catch {
    return null
  }
}

export async function loadGuestStarterPikachu(): Promise<Pokemon | null> {
  const raw = await fetchGuestStarterPikachu()
  if (!raw) return null

  // Fields on `raw` are already fully resolved objects (hydrated server-side),
  // exactly like the enemy preview's RawPokemon — no lookup tables needed.
  return createPokemon(
    raw.name,
    String(raw.ID),
    raw.sprite ?? "",
    raw.type1 as PokemonType,
    raw.type2 as PokemonType,
    raw.level,
    raw.nature as Nature,
    raw.item as Item,
    raw.ability as Ability,
    raw.abilities as Ability[],
    raw.baseStats,
    raw.EVs,
    raw.IVs,
    raw.finalStats.HP,
    raw.finalStats,
    raw.moveset as PokemonMove[],
    raw.allMoves as PokemonMove[],
    raw.forms[raw.form as string] as unknown as PokemonForm,
    raw.forms as unknown as PokemonForms,
    raw.gender,
    raw.femaleSprite,
    { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 }
  )
}
