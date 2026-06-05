import { useState } from "react"
import { Abilities, Items, Natures, PokemonMoves, PokemonTypes, Box } from "@/lib/utils/types.ts"
import { fetchAddBox, fetchRemoveBox, fetchClearBox, resolveBoxes } from "@/lib/api/boxes"
import { toast } from "sonner"
import apiClient from "@/lib/infrastructure/apiClient"

type Options = {
  abilityOptions: Abilities
  itemOptions: Items
  natureOptions: Natures
  movesOptions: PokemonMoves
  typesOptions: PokemonTypes
}

export function useBoxManager({ abilityOptions, itemOptions, natureOptions, movesOptions, typesOptions }: Options) {
  const [p1Boxes, setP1Boxes] = useState<Box[]>([])
  const [p1BoxNames, setP1BoxNames] = useState<string[]>([])
  const [activeBoxIndex, setActiveBoxIndex] = useState(0)
  const [originalPokemon, setOriginalPokemon] = useState<Box>({})

  const updateActiveBox = (newPokemonBox: Box) => {
    setP1Boxes((prev) => {
      const updated = [...prev]
      updated[activeBoxIndex] = newPokemonBox
      return updated
    })
  }

  const addBox = async () => {
    const name = window.prompt("Name this box:")
    if (!name) return
    try {
      const myBoxesJSON = await fetchAddBox()
      const resolvedBoxes = resolveBoxes(myBoxesJSON.allBoxes, abilityOptions, itemOptions, natureOptions, movesOptions, typesOptions)
      setP1Boxes(resolvedBoxes)
      setP1BoxNames(prev => {
        const updated = [...prev, name]
        localStorage.setItem("p1BoxNames", JSON.stringify(updated))
        return updated
      })
      setActiveBoxIndex(resolvedBoxes.length - 1)
    } catch (err) {
      toast.error(`Failed to add box: ${err}`)
    }
  }

  const removeBox = async () => {
    if (p1Boxes.length <= 1) { toast.error("You must keep at least one box."); return }
    if (!window.confirm(`Delete "${p1BoxNames[activeBoxIndex]}"? This cannot be undone.`)) return
    try {
      const myBoxesJSON = await fetchRemoveBox(String(activeBoxIndex))
      const resolvedBoxes = resolveBoxes(myBoxesJSON.allBoxes, abilityOptions, itemOptions, natureOptions, movesOptions, typesOptions)
      setP1Boxes(resolvedBoxes)
      setP1BoxNames(prev => {
        const updated = prev.filter((_, i) => i !== activeBoxIndex)
        localStorage.setItem("p1BoxNames", JSON.stringify(updated))
        return updated
      })
      setActiveBoxIndex(Math.max(0, activeBoxIndex - 1))
    } catch (err) {
      toast.error(`Failed to remove box: ${err}`)
    }
  }

  const clearBox = async () => {
    if (!window.confirm(`Clear all Pokemon from Box ${activeBoxIndex + 1}? This cannot be undone.`)) return
    try {
      const myBoxesJSON = await fetchClearBox(String(activeBoxIndex))
      const resolvedBoxes = resolveBoxes(myBoxesJSON.allBoxes, abilityOptions, itemOptions, natureOptions, movesOptions, typesOptions)
      setP1Boxes(resolvedBoxes)
    } catch (err) {
      toast.error(`Failed to clear box: ${err}`)
    }
  }

  const removePokemonFromBox = async (boxIndex: number, pokemonName: string) => {
    try {
      const json = (await apiClient.delete(`/myBoxes/${boxIndex}/${pokemonName}`)).data
      const resolvedBoxes = resolveBoxes(json.allBoxes, abilityOptions, itemOptions, natureOptions, movesOptions, typesOptions)
      setP1Boxes(resolvedBoxes)
    } catch (err) {
      toast.error(`Failed to remove ${pokemonName}: ${err}`)
    }
  }

  return {
    p1Boxes, setP1Boxes,
    p1BoxNames, setP1BoxNames,
    activeBoxIndex, setActiveBoxIndex,
    originalPokemon, setOriginalPokemon,
    updateActiveBox,
    addBox,
    removeBox,
    clearBox,
    removePokemonFromBox,
  }
}
