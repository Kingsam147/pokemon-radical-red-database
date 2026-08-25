import { describe, test, expect, afterEach, vi } from "vitest"
import { readStoredCheckedTMs, readStoredTutorTier, nextCheckedTMs } from "@/lib/hooks/useUIState"

function stubLocalStorage(values: Record<string, string>) {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => (key in values ? values[key] : null),
    },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("nextCheckedTMs", () => {
  test("adds a move name when it is not already checked", () => {
    expect(nextCheckedTMs(["Cut"], "Toxic")).toEqual(["Cut", "Toxic"])
  })

  test("removes a move name when it is already checked", () => {
    expect(nextCheckedTMs(["Cut", "Toxic"], "Cut")).toEqual(["Toxic"])
  })
})

describe("readStoredCheckedTMs", () => {
  test("returns an empty array when window is unavailable", () => {
    vi.stubGlobal("window", undefined)
    expect(readStoredCheckedTMs()).toEqual([])
  })

  test("returns an empty array when nothing is stored yet", () => {
    stubLocalStorage({})
    expect(readStoredCheckedTMs()).toEqual([])
  })

  test("parses a previously stored list", () => {
    stubLocalStorage({ rr_checked_tms: JSON.stringify(["Cut", "Toxic"]) })
    expect(readStoredCheckedTMs()).toEqual(["Cut", "Toxic"])
  })

  test("returns an empty array when the stored value is malformed", () => {
    stubLocalStorage({ rr_checked_tms: "{not json" })
    expect(readStoredCheckedTMs()).toEqual([])
  })
})

describe("readStoredTutorTier", () => {
  test("returns null when window is unavailable", () => {
    vi.stubGlobal("window", undefined)
    expect(readStoredTutorTier()).toBe(null)
  })

  test("returns null when nothing is stored yet", () => {
    stubLocalStorage({})
    expect(readStoredTutorTier()).toBe(null)
  })

  test("parses a previously stored tier", () => {
    stubLocalStorage({ rr_tutor_tier: "3" })
    expect(readStoredTutorTier()).toBe(3)
  })

  test("returns null when the stored value is malformed", () => {
    stubLocalStorage({ rr_tutor_tier: "{not json" })
    expect(readStoredTutorTier()).toBe(null)
  })
})
