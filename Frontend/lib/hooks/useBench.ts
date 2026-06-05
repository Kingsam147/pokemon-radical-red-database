import { useState } from "react"
import { Pokemon, PokemonStats, Gender, PokemonStatuses, Natures, Items } from "@/lib/utils/types.ts"
import { calcStats } from "@/lib/api/misc"
import { POKEMON_SPRITES } from "@/lib/utils/sprites"
import { toast } from "sonner"

type Options = {
  statusOptions: PokemonStatuses
  natureOptions: Natures
  itemOptions: Items
}

export function useBench({ statusOptions, natureOptions, itemOptions }: Options) {
  const [player1Bench, setPlayer1Bench] = useState<(Pokemon | null)[]>(Array(6).fill(null))
  const [player2Bench, setPlayer2Bench] = useState<(Pokemon | null)[]>(Array(6).fill(null))
  const [draggedPokemon, setDraggedPokemon] = useState<{ pokemon: Pokemon; source: string } | null>(null)

  const handleDragStart = (pokemon: Pokemon, source: string) => {
    setDraggedPokemon({ pokemon, source })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const isInBench = (pokemon: Pokemon, player: 1 | 2) => {
    const bench = player === 1 ? player1Bench : player2Bench
    return bench.some((p) => p?.ID === pokemon.ID)
  }

  const faintPokemon = (player: 1 | 2, slotIndex: number) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench
    setBench((prev) =>
      prev.map((p, i) => {
        if (i === slotIndex && p) {
          const isFainted = p.status.name === "Fainted"
          return {
            ...p,
            currentHp: isFainted ? p.maxHp : 0,
            status: isFainted ? statusOptions["Healthy"] : statusOptions["Fainted"],
          }
        }
        return p
      })
    )
  }

  const updatePokemonForm = (player: 1 | 2, slotIndex: number, newFormName: string) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench
    setBench((prev) => prev.map((p, i) => {
      if (i !== slotIndex || !p) return p
      const newForm = p.forms[newFormName]
      if (!newForm) return p
      const updated = {
        ...p,
        form: newForm,
        sprite: POKEMON_SPRITES(String(newForm.ID)),
        type1: newForm.type1,
        type2: newForm.type2,
        types: newForm.type2.name !== "None" ? [newForm.type1, newForm.type2] : [newForm.type1],
        ability: newForm.ability,
        abilities: newForm.abilities,
        baseStats: newForm.baseStats,
        finalStats: newForm.finalStats,
        allMoves: newForm.allMoves,
      }
      calcStats(updated).then((newStats) => {
        setBench((prev2) => prev2.map((p2, i2) =>
          i2 === slotIndex && p2
            ? { ...p2, finalStats: newStats, maxHp: newStats.HP, currentHp: Math.min(p2.currentHp, newStats.HP) }
            : p2
        ))
      }).catch((err) => toast.error(`Failed to recalculate stats: ${err}`))
      return updated
    }))
  }

  const updatePokemonHp = (player: 1 | 2, slotIndex: number, newHp: number) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench
    setBench((prev) => prev.map((p, i) => {
      if (i !== slotIndex || !p) return p
      return { ...p, currentHp: Math.min(newHp, p.maxHp) }
    }))
  }

  const updatePokemonStatus = (player: 1 | 2, slotIndex: number, statusName: string) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench
    setBench((prev) => prev.map((p, i) => {
      if (i !== slotIndex || !p) return p
      const updated = { ...p, status: statusOptions[statusName] }
      calcStats(updated).then((newStats) => {
        setBench((prev2) => prev2.map((p2, i2) =>
          i2 === slotIndex && p2
            ? { ...p2, finalStats: newStats, maxHp: newStats.HP, currentHp: Math.min(p2.currentHp, newStats.HP) }
            : p2
        ))
      }).catch((err) => toast.error(`Failed to recalculate stats: ${err}`))
      return updated
    }))
  }

  const updatePokemonNature = (player: 1 | 2, slotIndex: number, natureName: string) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench
    setBench((prev) => prev.map((p, i) => {
      if (i !== slotIndex || !p) return p
      const updated = { ...p, nature: natureOptions[natureName] }
      calcStats(updated).then((newStats) => {
        setBench((prev2) => prev2.map((p2, i2) =>
          i2 === slotIndex && p2
            ? { ...p2, finalStats: newStats, maxHp: newStats.HP, currentHp: Math.min(p2.currentHp, newStats.HP) }
            : p2
        ))
      }).catch((err) => toast.error(`Failed to recalculate stats: ${err}`))
      return updated
    }))
  }

  const updatePokemonItem = (player: 1 | 2, slotIndex: number, itemName: string) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench
    setBench((prev) => prev.map((p, i) => {
      if (i !== slotIndex || !p) return p
      return { ...p, item: itemOptions[itemName] }
    }))
  }

  const updatePokemonAbility = (player: 1 | 2, slotIndex: number, abilityName: string) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench
    setBench((prev) => prev.map((p, i) => {
      if (i !== slotIndex || !p) return p
      const ability = p.abilities.find(a => a.name === abilityName)
      if (!ability) return p
      return { ...p, ability }
    }))
  }

  const updateAbilityToggle = (player: 1 | 2, slotIndex: number, toggledOn: boolean) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench
    setBench((prev) => prev.map((p, i) => {
      if (i !== slotIndex || !p) return p
      return { ...p, ability: { ...p.ability, toggledOn } }
    }))
  }

  const updatePokemonMove = (
    player: 1 | 2,
    slotIndex: number,
    moveIndex: number,
    newMoveName?: string,
    newType?: string,
    newCategory?: string
  ) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench
    setBench((prev) =>
      prev.map((p, i) => {
        if (i !== slotIndex || !p) return p
        const updatedMoveset = p.moveset.map((m, idx) => {
          if (idx !== moveIndex) return m
          if (newMoveName && newMoveName !== m.name) {
            const newMove = p.allMoves.find((mv) => mv.name === newMoveName)
            return newMove ?? m
          }
          if (newType) return { ...m, type: newType }
          if (newCategory) return { ...m, category: newCategory }
          return m
        })
        return { ...p, moveset: updatedMoveset }
      })
    )
  }

  const updatePokemonGender = (player: 1 | 2, slotIndex: number, gender: Gender) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench
    setBench((prev) => prev.map((p, i) => {
      if (i === slotIndex && p) return { ...p, gender }
      return p
    }))
  }

  const updatePokemonStat = async (
    player: 1 | 2,
    slotIndex: number,
    statCategory: "baseStats" | "IVs" | "EVs" | "statBoosts",
    statName: keyof PokemonStats,
    value: string,
  ) => {
    const numValue = parseInt(value) || 0
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench
    let updatedPokemon: Pokemon | null = null

    setBench((prev) => {
      const newBench = [...prev]
      const p = newBench[slotIndex]
      if (p) {
        updatedPokemon = { ...p, [statCategory]: { ...p[statCategory], [statName]: numValue } }
        newBench[slotIndex] = updatedPokemon
      }
      return newBench
    })

    if (updatedPokemon) {
      try {
        const newStats = await calcStats(updatedPokemon)
        setBench((prev) =>
          prev.map((p, i) =>
            i === slotIndex && p
              ? { ...p, finalStats: newStats, maxHp: newStats.HP, currentHp: Math.min(p.currentHp, newStats.HP) }
              : p
          )
        )
      } catch (error) {
        toast.error(`Failed to recalculate stats: ${error}`)
      }
    }
  }

  const updatePokemonLevel = (player: 1 | 2, slotIndex: number, level: string) => {
    const newLevel = Math.max(1, Math.min(100, parseInt(level) || 1))
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench
    setBench((prev) => prev.map((p, i) => {
      if (i !== slotIndex || !p) return p
      const updated = { ...p, level: newLevel }
      calcStats(updated).then((newStats) => {
        setBench((prev2) => prev2.map((p2, i2) =>
          i2 === slotIndex && p2
            ? { ...p2, finalStats: newStats, maxHp: newStats.HP, currentHp: newStats.HP }
            : p2
        ))
      }).catch((err) => toast.error(`Failed to recalculate stats: ${err}`))
      return updated
    }))
  }

  return {
    player1Bench, setPlayer1Bench,
    player2Bench, setPlayer2Bench,
    draggedPokemon, setDraggedPokemon,
    handleDragStart,
    handleDragOver,
    isInBench,
    faintPokemon,
    updatePokemonForm,
    updatePokemonHp,
    updatePokemonStatus,
    updatePokemonNature,
    updatePokemonItem,
    updatePokemonAbility,
    updateAbilityToggle,
    updatePokemonMove,
    updatePokemonGender,
    updatePokemonStat,
    updatePokemonLevel,
  }
}
