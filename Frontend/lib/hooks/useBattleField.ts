import { useState } from "react"

export type Hazards = {
  spikes: number
  tSpikes: number
  sRock: boolean
  reflect: boolean
  lightScreen: boolean
  protect: boolean
  stickyWebs: boolean
  leechSeed: boolean
  helpingHand: boolean
  tailWind: boolean
  flowerGift: boolean
  friendGuard: boolean
  auroraVeil: boolean
  switchingOut: boolean
}

const DEFAULT_HAZARDS: Hazards = {
  spikes: 0, tSpikes: 0, sRock: false, reflect: false, lightScreen: false,
  protect: false, stickyWebs: false, leechSeed: false, helpingHand: false,
  tailWind: false, flowerGift: false, friendGuard: false, auroraVeil: false,
  switchingOut: false,
}

export function useBattleField() {
  const [battleMode, setBattleMode] = useState<"singles" | "doubles">("singles")
  const [doublesType, setDoublesType] = useState<"True" | "Partner" | "None">("None")
  const [p1Hazards, setP1Hazards] = useState<Hazards>(DEFAULT_HAZARDS)
  const [p2Hazards, setP2Hazards] = useState<Hazards>(DEFAULT_HAZARDS)
  const [activeEffects, setActiveEffects] = useState<string[]>([])

  const activeIndices = battleMode === "singles" ? [0] : [0, 1]

  const toggleHazard = (player: 1 | 2, key: string) => {
    const setHazards = player === 1 ? setP1Hazards : setP2Hazards
    setHazards((prev) => {
      if (key === "spikes") return { ...prev, spikes: (prev.spikes + 1) % 4 }
      if (key === "tSpikes") return { ...prev, tSpikes: (prev.tSpikes + 1) % 3 }
      return { ...prev, [key]: !prev[key as keyof Hazards] }
    })
  }

  const toggleEffect = (effect: string) => {
    setActiveEffects((prev) =>
      prev.includes(effect) ? prev.filter((e) => e !== effect) : [...prev, effect]
    )
  }

  return {
    battleMode, setBattleMode,
    doublesType, setDoublesType,
    p1Hazards,
    p2Hazards,
    activeEffects,
    activeIndices,
    toggleHazard,
    toggleEffect,
  }
}
