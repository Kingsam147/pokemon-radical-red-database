import {
  Pokemon,
  RawPokemon,
  RawPokemonForm,
  PokemonType,
  Nature,
  Item,
  Ability,
  PokemonMove,
  PokemonMoves,
  PokemonForm,
  PokemonForms,
  createPokemon,
} from "@/lib/utils/types.ts"
import { POKEMON_SPRITES } from "@/lib/utils/sprites.ts"
import apiClient from "@/lib/infrastructure/apiClient"

async function fetchGuestStarterPikachu(): Promise<RawPokemon | null> {
  try {
    const res = await apiClient.get("/public/guest-starter-pikachu")
    return res.data.pokemon
  } catch {
    return null
  }
}

// allMoves arrives as move-name strings, same as every other Pokemon source —
// resolve them against the misc moves list with the same not-yet-loaded
// fallback used in teams.ts/boxes.ts, since this loader can run before misc
// data finishes fetching.
function resolveMoves(names: (string | PokemonMove)[], movesList: PokemonMoves): PokemonMove[] {
  return names.map((m) => typeof m === "string" ? (movesList[m.toLowerCase().replaceAll(/[^a-z0-9]/g, "")] ?? { name: m }) : m)
}

export async function loadGuestStarterPikachu(movesList: PokemonMoves = {}): Promise<Pokemon | null> {
  const raw = await fetchGuestStarterPikachu()
  if (!raw) return null

  // Every other field on `raw` is already a fully resolved object (hydrated
  // server-side), exactly like the enemy preview's RawPokemon — only the
  // sprite and allMoves need building/resolving on this side.
  for (const rawForm of Object.values(raw.forms)) {
    const form = rawForm as unknown as PokemonForm
    form.sprite = POKEMON_SPRITES(String(rawForm.ID))
    form.allMoves = resolveMoves((rawForm as RawPokemonForm).allMoves, movesList)
  }

  return createPokemon(
    raw.name,
    String(raw.ID),
    POKEMON_SPRITES(String(raw.ID)),
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
    resolveMoves(raw.allMoves, movesList),
    raw.forms[raw.form as string] as unknown as PokemonForm,
    raw.forms as unknown as PokemonForms,
    raw.gender,
    raw.femaleSprite,
    { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 }
  )
}
