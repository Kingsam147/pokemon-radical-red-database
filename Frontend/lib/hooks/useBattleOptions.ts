import { useState } from "react"
import { Abilities, Items, PokemonMoves, PokemonTypes, Natures, PokemonStatuses } from "@/lib/utils/types.ts"

export function useBattleOptions() {
  const [abilityOptions, setAbilityOptions] = useState<Abilities>({})
  const [itemOptions, setItemOptions] = useState<Items>({})
  const [movesOptions, setMovesOptions] = useState<PokemonMoves>({})
  const [typesOptions, setTypesOptions] = useState<PokemonTypes>({})
  const [natureOptions, setNatureOptions] = useState<Natures>({})
  const [statusOptions, setStatusOptions] = useState<PokemonStatuses>({})

  return {
    abilityOptions, setAbilityOptions,
    itemOptions, setItemOptions,
    movesOptions, setMovesOptions,
    typesOptions, setTypesOptions,
    natureOptions, setNatureOptions,
    statusOptions, setStatusOptions,
  }
}
