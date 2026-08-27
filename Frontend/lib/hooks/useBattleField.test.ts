import { describe, test, expect } from "vitest"
import type { Hazards } from "@/lib/hooks/useBattleField"
import { fieldToggleRecalcSignature } from "@/lib/hooks/useBattleField"

const baseHazards: Hazards = {
  spikes: 0, tSpikes: 0, sRock: false, reflect: false, lightScreen: false,
  protect: false, stickyWebs: false, leechSeed: false, helpingHand: false,
  tailWind: false, flowerGift: false, friendGuard: false, auroraVeil: false,
  switchingOut: false,
}

const withKey = (source: Hazards, key: keyof Hazards, value: boolean | number): Hazards => {
  const next = { ...source }
  if (key === "spikes" || key === "tSpikes") {
    next[key] = value as number
  } else {
    next[key] = value as never
  }
  return next
}

const sigFor = (player: 1 | 2, p1: Hazards, p2: Hazards) => fieldToggleRecalcSignature(player, p1, p2)

describe("fieldToggleRecalcSignature", () => {
  test("opponent-only toggle on P1's side changes P2's signature but not P1's", () => {
    const p1Toggled = withKey(baseHazards, "reflect", true)

    expect(sigFor(1, p1Toggled, baseHazards)).toBe(sigFor(1, baseHazards, baseHazards))
    expect(sigFor(2, p1Toggled, baseHazards)).not.toBe(sigFor(2, baseHazards, baseHazards))
  })

  test("opponent-only toggle on P2's side changes P1's signature but not P2's", () => {
    const p2Toggled = withKey(baseHazards, "friendGuard", true)

    expect(sigFor(2, baseHazards, p2Toggled)).toBe(sigFor(2, baseHazards, baseHazards))
    expect(sigFor(1, baseHazards, p2Toggled)).not.toBe(sigFor(1, baseHazards, baseHazards))
  })

  test("self-only toggles change the toggling player's signature only", () => {
    for (const key of ["helpingHand", "flowerGift"] as (keyof Hazards)[]) {
      const p1Toggled = withKey(baseHazards, key, true)

      expect(sigFor(1, p1Toggled, baseHazards)).not.toBe(sigFor(1, baseHazards, baseHazards))
      expect(sigFor(2, p1Toggled, baseHazards)).toBe(sigFor(2, baseHazards, baseHazards))
    }
  })

  test("tailwind toggle on one side changes both players' signatures", () => {
    const p1Toggled = withKey(baseHazards, "tailWind", true)

    expect(sigFor(1, p1Toggled, baseHazards)).not.toBe(sigFor(1, baseHazards, baseHazards))
    expect(sigFor(2, p1Toggled, baseHazards)).not.toBe(sigFor(2, baseHazards, baseHazards))
  })

  test("no-recalc toggles never change either player's signature", () => {
    for (const key of ["sRock", "stickyWebs", "leechSeed", "tSpikes"] as (keyof Hazards)[]) {
      const value = key === "tSpikes" ? 1 : true
      const p1Toggled = withKey(baseHazards, key, value)
      const p2Toggled = withKey(baseHazards, key, value)

      expect(sigFor(1, p1Toggled, baseHazards)).toBe(sigFor(1, baseHazards, baseHazards))
      expect(sigFor(2, p1Toggled, baseHazards)).toBe(sigFor(2, baseHazards, baseHazards))
      expect(sigFor(1, baseHazards, p2Toggled)).toBe(sigFor(1, baseHazards, baseHazards))
      expect(sigFor(2, baseHazards, p2Toggled)).toBe(sigFor(2, baseHazards, baseHazards))
    }
  })
})
