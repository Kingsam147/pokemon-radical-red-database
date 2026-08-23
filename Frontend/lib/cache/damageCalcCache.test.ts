import { describe, test, expect } from "vitest"
import { buildCalcCacheKey, getCachedDamageCalc, setCachedDamageCalc } from "@/lib/cache/damageCalcCache"
import type { DamageCalcPayload } from "@/lib/api/misc"

const buildPayload = (moveName: string): DamageCalcPayload => ({
  attacker: { name: "Charizard", level: 50, types: ["Fire", "Flying"] } as unknown as DamageCalcPayload["attacker"],
  defender: { name: "Blastoise", level: 50, types: ["Water"] } as unknown as DamageCalcPayload["defender"],
  move: { name: moveName, isCrit: false, isZ: false },
  field: {},
  abilityToggles: {},
})

describe("damageCalcCache", () => {
  test("returns undefined for a key that was never cached", () => {
    expect(getCachedDamageCalc(buildCalcCacheKey(buildPayload("Unseen Move")))).toBeUndefined()
  })

  test("a cached result is retrievable by the key built from an equal-but-different object instance", () => {
    // This is the "string, not object comparison" behavior requested: two separately-constructed
    // payloads with identical values must collapse to the same cache key.
    const result: import("@/lib/utils/types").DamageResult = { range: ["49%", "57%"], damage: [80], description: "Flamethrower" }
    setCachedDamageCalc(buildCalcCacheKey(buildPayload("Flamethrower")), result)

    const lookupKey = buildCalcCacheKey(buildPayload("Flamethrower"))
    expect(getCachedDamageCalc(lookupKey)).toBe(result)
  })

  test("payloads that differ in a calc-relevant field produce different cache keys", () => {
    const keyA = buildCalcCacheKey(buildPayload("Flare Blitz"))
    const keyB = buildCalcCacheKey(buildPayload("Dragon Claw"))
    expect(keyA).not.toBe(keyB)
  })
})
