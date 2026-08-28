import { describe, test, expect, afterEach, vi } from "vitest"
import {
  isUnsavedP1Selection,
  readGuestPikachuRemoved,
  markGuestPikachuRemoved,
  shouldInjectGuestStarterPikachu,
} from "@/lib/utils/guestStarterPikachuGuards"
import type { Pokemon } from "@/lib/utils/types"

const stubPikachu = { name: "Pikachu" } as unknown as Pokemon

function stubLocalStorage(values: Record<string, string>) {
  const store = { ...values }
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => { store[key] = value },
    },
  })
  return store
}

afterEach(() => {
  vi.unstubAllGlobals()
})

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

describe("readGuestPikachuRemoved", () => {
  test("returns false when window is unavailable", () => {
    vi.stubGlobal("window", undefined)
    expect(readGuestPikachuRemoved()).toBe(false)
  })

  test("returns false for a guest who has never removed the starter", () => {
    stubLocalStorage({})
    expect(readGuestPikachuRemoved()).toBe(false)
  })

  test("returns true once the removal has been recorded", () => {
    stubLocalStorage({ rr_guest_pikachu_removed: "true" })
    expect(readGuestPikachuRemoved()).toBe(true)
  })

  test("treats any non-\"true\" value as not removed", () => {
    stubLocalStorage({ rr_guest_pikachu_removed: "1" })
    expect(readGuestPikachuRemoved()).toBe(false)
  })
})

describe("markGuestPikachuRemoved", () => {
  test("persists the removal so a later read reports it", () => {
    stubLocalStorage({})
    markGuestPikachuRemoved()
    expect(readGuestPikachuRemoved()).toBe(true)
  })

  test("is a no-op when window is unavailable", () => {
    vi.stubGlobal("window", undefined)
    expect(() => markGuestPikachuRemoved()).not.toThrow()
  })
})

describe("shouldInjectGuestStarterPikachu", () => {
  test("injects for a guest who has not removed the starter", () => {
    expect(shouldInjectGuestStarterPikachu(false, false)).toBe(true)
  })

  test("does not inject once the guest has removed it", () => {
    expect(shouldInjectGuestStarterPikachu(false, true)).toBe(false)
  })

  test("never injects for an authenticated user", () => {
    expect(shouldInjectGuestStarterPikachu(true, false)).toBe(false)
    expect(shouldInjectGuestStarterPikachu(true, true)).toBe(false)
  })
})
