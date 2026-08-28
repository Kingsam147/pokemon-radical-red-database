import { useEffect, useRef, useState } from "react"
import { Abilities, Items, Natures, PokemonMoves, PokemonTypes, Box } from "@/lib/utils/types.ts"
import { fetchAddBox, fetchRemoveBox, fetchClearBox, fetchSingleBox, resolveSingleBox } from "@/lib/api/boxes"
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
  const [p1Boxes, setP1Boxes] = useState<(Box | null)[]>([])
  const [p1BoxNames, setP1BoxNames] = useState<string[]>([])
  const [activeBoxIndex, setActiveBoxIndex] = useState(0)
  const [originalPokemon, setOriginalPokemon] = useState<Box>({})
  const [isBoxLoading, setIsBoxLoading] = useState(false)

  // prefetchRemainingBoxes runs from a callback captured once at mount, so it
  // would otherwise always see the initial (stale) p1Boxes closure. Read
  // through a ref that tracks the latest value instead.
  const p1BoxesRef = useRef(p1Boxes)
  useEffect(() => {
    p1BoxesRef.current = p1Boxes
  }, [p1Boxes])

  const updateActiveBox = (newPokemonBox: Box) => {
    setP1Boxes((prev) => {
      const updated = [...prev]
      updated[activeBoxIndex] = newPokemonBox
      return updated
    })
  }

  // switchBox sets the active tab and lazily fetches the box if not yet loaded.
  // p1Boxes[index] === null means "placeholder — not fetched yet".
  const switchBox = async (index: number) => {
    setActiveBoxIndex(index)
    if (p1Boxes[index] !== null) return
    setIsBoxLoading(true)
    try {
      const rawBox = await fetchSingleBox(index)
      const resolved = resolveSingleBox(rawBox, abilityOptions, itemOptions, natureOptions, movesOptions, typesOptions)
      setP1Boxes(prev => {
        const updated = [...prev]
        updated[index] = resolved
        return updated
      })
    } catch (err) {
      toast.error(`Failed to load box: ${err}`)
    } finally {
      setIsBoxLoading(false)
    }
  }

  const addBox = async () => {
    const name = window.prompt("Name this box:")
    if (!name) return
    try {
      const json = await fetchAddBox()
      setP1Boxes(prev => [...prev, {}])
      setP1BoxNames(prev => {
        const updated = [...prev, name]
        localStorage.setItem("p1BoxNames", JSON.stringify(updated))
        return updated
      })
      setActiveBoxIndex(json.count - 1)
    } catch (err) {
      toast.error(`Failed to add box: ${err}`)
    }
  }

  const removeBox = async () => {
    if (!window.confirm(`Delete "${p1BoxNames[activeBoxIndex]}"? This cannot be undone.`)) return
    try {
      const json = await fetchRemoveBox(String(activeBoxIndex))
      const { count, newActiveIndex } = json
      setP1Boxes(prev => {
        const filtered = prev.filter((_, i) => i !== activeBoxIndex)
        while (filtered.length < count) filtered.push({})
        return filtered
      })
      setP1BoxNames(prev => {
        const filtered = prev.filter((_, i) => i !== activeBoxIndex)
        while (filtered.length < count) filtered.push(`Box ${filtered.length + 1}`)
        localStorage.setItem("p1BoxNames", JSON.stringify(filtered))
        return filtered
      })
      setActiveBoxIndex(newActiveIndex)
    } catch (err) {
      toast.error(`Failed to remove box: ${err}`)
    }
  }

  const clearBox = async (): Promise<boolean> => {
    if (!window.confirm(`Clear all Pokemon from Box ${activeBoxIndex + 1}? This cannot be undone.`)) return false
    try {
      await fetchClearBox(String(activeBoxIndex))
      setP1Boxes(prev => {
        const updated = [...prev]
        updated[activeBoxIndex] = {}
        return updated
      })
      return true
    } catch (err) {
      toast.error(`Failed to clear box: ${err}`)
      return false
    }
  }

  const prefetchRemainingBoxes = async (totalCount: number) => {
    for (let i = 1; i < totalCount; i++) {
      if (p1BoxesRef.current[i] !== null) continue;
      try {
        const rawBox = await fetchSingleBox(i);
        const resolved = resolveSingleBox(rawBox, abilityOptions, itemOptions, natureOptions, movesOptions, typesOptions);
        setP1Boxes(prev => {
          if (prev[i] !== null) return prev;
          const updated = [...prev];
          updated[i] = resolved;
          return updated;
        });
      } catch {
        // Will load on demand when user clicks the tab
      }
    }
  };

  const removePokemonFromBox = async (boxIndex: number, pokemonName: string) => {
    try {
      const json = (await apiClient.delete(`/myBoxes/${boxIndex}/${pokemonName}`)).data
      const resolved = resolveSingleBox(json.updatedBox, abilityOptions, itemOptions, natureOptions, movesOptions, typesOptions)
      setP1Boxes(prev => {
        const updated = [...prev]
        updated[boxIndex] = resolved
        return updated
      })
    } catch (err) {
      toast.error(`Failed to remove ${pokemonName}: ${err}`)
    }
  }

  return {
    p1Boxes, setP1Boxes,
    p1BoxNames, setP1BoxNames,
    activeBoxIndex, setActiveBoxIndex,
    isBoxLoading,
    originalPokemon, setOriginalPokemon,
    updateActiveBox,
    switchBox,
    prefetchRemainingBoxes,
    addBox,
    removeBox,
    clearBox,
    removePokemonFromBox,
  }
}
