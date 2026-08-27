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

// Field toggles whose effect lands on the opposing player's damage: flipping one on
// a side only re-runs the *other* player's calcs.
export const OPPONENT_RECALC_HAZARD_KEYS: (keyof Hazards)[] = [
  "reflect", "lightScreen", "auroraVeil", "protect", "switchingOut", "friendGuard",
]

// Field toggles that only buff their owner's outgoing damage: flipping one on a side
// only re-runs *that* player's calcs.
export const SELF_RECALC_HAZARD_KEYS: (keyof Hazards)[] = ["helpingHand", "flowerGift"]

// Field toggles that alter their owner's own stats and are read from both sides by
// the calc engine: flipping one on either side re-runs both players' calcs.
export const BOTH_RECALC_HAZARD_KEYS: (keyof Hazards)[] = ["tailWind"]

// Stable string that changes only when a toggle relevant to `player`'s displayed
// damage flips. Used as a single dependency for the batch-recalc effect so that
// irrelevant field toggles (spikes, leech seed, the opponent's helping hand, ...)
// never retrigger a calc for this side.
export function fieldToggleRecalcSignature(player: 1 | 2, p1Hazards: Hazards, p2Hazards: Hazards): string {
  const ownHazards = player === 1 ? p1Hazards : p2Hazards
  const opponentHazards = player === 1 ? p2Hazards : p1Hazards
  const own = SELF_RECALC_HAZARD_KEYS.map((key) => `${key}:${ownHazards[key]}`).join("|")
  const opponent = OPPONENT_RECALC_HAZARD_KEYS.map((key) => `${key}:${opponentHazards[key]}`).join("|")
  const both = BOTH_RECALC_HAZARD_KEYS.map((key) => `${key}:${p1Hazards[key]},${p2Hazards[key]}`).join("|")
  return `${own}||${opponent}||${both}`
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
