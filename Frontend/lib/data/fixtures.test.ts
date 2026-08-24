import { describe, test, expect } from "vitest"
import { GUEST_STARTER_PIKACHU_FIXTURE, hydrateAllMoves } from "@/lib/data/guestStarterPikachuFixture"
import { ENEMY_PREVIEW_FIXTURE } from "@/lib/data/enemyPreviewFixture"
import type { PokemonMoves } from "@/lib/utils/types"

describe("GUEST_STARTER_PIKACHU_FIXTURE", () => {
  test("is a fully-resolved Level 5 Pikachu with the S3 sprite convention", () => {
    expect(GUEST_STARTER_PIKACHU_FIXTURE.name).toBe("Pikachu")
    expect(GUEST_STARTER_PIKACHU_FIXTURE.ID).toBe("25")
    expect(GUEST_STARTER_PIKACHU_FIXTURE.level).toBe(5)
    expect(GUEST_STARTER_PIKACHU_FIXTURE.sprite).toBe("https://pokemon-radical-red.s3.us-east-2.amazonaws.com/pokemon/25.png")
    expect(GUEST_STARTER_PIKACHU_FIXTURE.currentHp).toBe(26)
  })

  test("allMoves ships unhydrated — {name} stubs, no network dependency to render", () => {
    expect(GUEST_STARTER_PIKACHU_FIXTURE.allMoves).toHaveLength(21)
    expect(GUEST_STARTER_PIKACHU_FIXTURE.allMoves.map((m) => m.name)).toContain("Thunderbolt")
    GUEST_STARTER_PIKACHU_FIXTURE.allMoves.forEach((move) => {
      expect(Object.keys(move)).toEqual(["name"])
    })
    expect(GUEST_STARTER_PIKACHU_FIXTURE.forms.Pikachu.allMoves).toEqual(GUEST_STARTER_PIKACHU_FIXTURE.allMoves)
  })

  test("moveset is the equipped 4-move set, already fully resolved", () => {
    expect(GUEST_STARTER_PIKACHU_FIXTURE.moveset.map((m) => m.name)).toEqual([
      "Volt Tackle", "Thunderbolt", "Iron Tail", "Quick Attack",
    ])
    expect(GUEST_STARTER_PIKACHU_FIXTURE.moveset[0]).toMatchObject({ basePower: 120, category: "Physical" })
  })
})

describe("hydrateAllMoves", () => {
  const movesList: PokemonMoves = {
    thunderbolt: { name: "Thunderbolt", basePower: 90, category: "Special", type: "Electric" },
  }

  test("resolves matching stubs into full move objects, keeping unmatched stubs as-is", () => {
    const hydrated = hydrateAllMoves(GUEST_STARTER_PIKACHU_FIXTURE, movesList)
    const thunderbolt = hydrated.allMoves.find((m) => m.name === "Thunderbolt")
    const growl = hydrated.allMoves.find((m) => m.name === "Growl")

    expect(thunderbolt).toEqual({ name: "Thunderbolt", basePower: 90, category: "Special", type: "Electric" })
    expect(growl).toEqual({ name: "Growl" })
  })

  test("also upgrades forms.Pikachu.allMoves, and does not mutate the original fixture", () => {
    const hydrated = hydrateAllMoves(GUEST_STARTER_PIKACHU_FIXTURE, movesList)

    expect(hydrated.forms.Pikachu.allMoves).toEqual(hydrated.allMoves)
    expect(GUEST_STARTER_PIKACHU_FIXTURE.allMoves.find((m) => m.name === "Thunderbolt")).toEqual({ name: "Thunderbolt" })
  })
})

describe("ENEMY_PREVIEW_FIXTURE", () => {
  test("wraps a fully-resolved Bulbasaur with the S3 sprite convention", () => {
    const bulbasaur = ENEMY_PREVIEW_FIXTURE.team.Bulbasaur as typeof GUEST_STARTER_PIKACHU_FIXTURE
    expect(bulbasaur.name).toBe("Bulbasaur")
    expect(bulbasaur.ID).toBe("1")
    expect(bulbasaur.sprite).toBe("https://pokemon-radical-red.s3.us-east-2.amazonaws.com/pokemon/1.png")
    expect(bulbasaur.moveset.map((m) => m.name)).toEqual(["Tackle", "Growl"])
  })

  test("team is keyed by teamName and carries a trainerInfo entry", () => {
    expect(ENEMY_PREVIEW_FIXTURE.team[ENEMY_PREVIEW_FIXTURE.teamName]).toBeUndefined()
    expect(ENEMY_PREVIEW_FIXTURE.team.trainerInfo).toMatchObject({ name: ENEMY_PREVIEW_FIXTURE.teamName, format: "Singles" })
  })
})
