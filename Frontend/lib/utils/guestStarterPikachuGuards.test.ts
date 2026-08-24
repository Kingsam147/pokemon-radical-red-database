import { describe, test, expect } from "vitest"
import { isUnsavedP1Selection } from "@/lib/utils/guestStarterPikachuGuards"
import type { Pokemon } from "@/lib/utils/types"

const stubPikachu = { name: "Pikachu" } as unknown as Pokemon

describe("isUnsavedP1Selection", () => {
  test("treats an empty selection as unsaved", () => {
    expect(isUnsavedP1Selection("", {})).toBe(true)
  })

  test("treats the guest starter's synthetic label as unsaved when it has no backing team entry", () => {
    expect(isUnsavedP1Selection("Example Pikachu Team", {})).toBe(true)
  })

  test("treats a real saved team name as saved (not unsaved)", () => {
    expect(isUnsavedP1Selection("My Team", { "My Team": [stubPikachu, null, null, null, null, null] })).toBe(false)
  })
})
