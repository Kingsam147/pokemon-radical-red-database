import { describe, test, expect } from "vitest"
import { shouldSeedGuestStarterPikachu, isUnsavedP1Selection } from "@/lib/utils/guestStarterPikachuGuards"
import type { Pokemon } from "@/lib/utils/types"

const stubPikachu = { name: "Pikachu" } as unknown as Pokemon
const emptyBench: (Pokemon | null)[] = [null, null, null, null, null, null]
const occupiedBench: (Pokemon | null)[] = [stubPikachu, null, null, null, null, null]

describe("shouldSeedGuestStarterPikachu", () => {
  test("seeds when the fetch succeeded, nothing is locked, and the bench is empty", () => {
    expect(shouldSeedGuestStarterPikachu({ pikachu: stubPikachu, cancelled: false, teamLocked: false, bench: emptyBench })).toBe(true)
  })

  test("does not seed when the effect instance was cancelled (guest logged in mid-fetch)", () => {
    expect(shouldSeedGuestStarterPikachu({ pikachu: stubPikachu, cancelled: true, teamLocked: false, bench: emptyBench })).toBe(false)
  })

  test("does not seed when the fetch failed (pikachu is null)", () => {
    expect(shouldSeedGuestStarterPikachu({ pikachu: null, cancelled: false, teamLocked: false, bench: emptyBench })).toBe(false)
  })

  test("does not seed once the user has picked or cleared a P1 team", () => {
    expect(shouldSeedGuestStarterPikachu({ pikachu: stubPikachu, cancelled: false, teamLocked: true, bench: emptyBench })).toBe(false)
  })

  test("does not seed when something already occupies the bench", () => {
    expect(shouldSeedGuestStarterPikachu({ pikachu: stubPikachu, cancelled: false, teamLocked: false, bench: occupiedBench })).toBe(false)
  })
})

describe("isUnsavedP1Selection", () => {
  test("treats an empty selection as unsaved", () => {
    expect(isUnsavedP1Selection("", {})).toBe(true)
  })

  test("treats the guest starter's synthetic label as unsaved when it has no backing team entry", () => {
    expect(isUnsavedP1Selection("Default Pikachu Box", {})).toBe(true)
  })

  test("treats a real saved team name as saved (not unsaved)", () => {
    expect(isUnsavedP1Selection("My Team", { "My Team": [stubPikachu, null, null, null, null, null] })).toBe(false)
  })
})
