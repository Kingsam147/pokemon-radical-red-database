import { describe, test, expect } from "vitest"
import { isPokemonInBench } from "@/lib/hooks/useBench"
import type { Pokemon } from "@/lib/utils/types"

const stub = (overrides: Partial<Pokemon>) => ({ ID: "25", name: "Pikachu", ...overrides }) as unknown as Pokemon

describe("isPokemonInBench", () => {
  test("boxKey match reports the exact box slot as benched", () => {
    const bench = [stub({ boxKey: "guestStarterPikachu" }), null, null, null, null, null]
    const clickedCard = stub({ boxKey: "guestStarterPikachu" })
    expect(isPokemonInBench(bench, clickedCard, "guestStarterPikachu")).toBe(true)
  })

  test(
    "a freshly imported Pokemon of the same species as an already-benched one is not " +
    "reported as benched, when matched by boxKey (regression: teamCrud silent Add/Remove flip)",
    () => {
      const bench = [stub({ boxKey: "guestStarterPikachu" }), null, null, null, null, null]
      const freshlyImportedCard = stub({ boxKey: "Pikachu" })
      expect(isPokemonInBench(bench, freshlyImportedCard, "Pikachu")).toBe(false)
    },
  )

  test("an unrelated species is never reported as benched", () => {
    const bench = [stub({ ID: "1", name: "Bulbasaur", boxKey: "Bulbasaur" }), null, null, null, null, null]
    expect(isPokemonInBench(bench, stub({ boxKey: "Pikachu" }), "Pikachu")).toBe(false)
  })

  test("without a boxKey, falls back to matching by species ID (legacy behavior)", () => {
    const bench = [stub({ ID: "25" }), null, null, null, null, null]
    expect(isPokemonInBench(bench, stub({ ID: "25" }))).toBe(true)
    expect(isPokemonInBench(bench, stub({ ID: "1", name: "Bulbasaur" }))).toBe(false)
  })

  test("an empty bench never reports anything as benched", () => {
    const bench: (Pokemon | null)[] = [null, null, null, null, null, null]
    expect(isPokemonInBench(bench, stub({ boxKey: "Pikachu" }), "Pikachu")).toBe(false)
  })
})
