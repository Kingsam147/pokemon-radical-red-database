import { describe, test, expect } from "vitest"
import { GUEST_STARTER_PIKACHU_FIXTURE } from "@/lib/data/guestStarterPikachuFixture"
import { ENEMY_PREVIEW_FIXTURE } from "@/lib/data/enemyPreviewFixture"

describe("GUEST_STARTER_PIKACHU_FIXTURE", () => {
  test("is a fully-resolved Level 5 Pikachu with the S3 sprite convention", () => {
    expect(GUEST_STARTER_PIKACHU_FIXTURE.name).toBe("Pikachu")
    expect(GUEST_STARTER_PIKACHU_FIXTURE.ID).toBe("25")
    expect(GUEST_STARTER_PIKACHU_FIXTURE.level).toBe(5)
    expect(GUEST_STARTER_PIKACHU_FIXTURE.sprite).toBe("https://pokemon-radical-red.s3.us-east-2.amazonaws.com/pokemon/25.png")
    expect(GUEST_STARTER_PIKACHU_FIXTURE.currentHp).toBe(26)
  })

  test("allMoves is the real level-5 legal movepool as fully-resolved PokemonMove objects", () => {
    expect(GUEST_STARTER_PIKACHU_FIXTURE.allMoves).toHaveLength(21)
    expect(GUEST_STARTER_PIKACHU_FIXTURE.allMoves.map((m) => m.name)).toContain("Thunderbolt")
    // Every entry must be a real, playable move object (not a bare name string)
    // since this fixture is inserted directly into bench/box state, bypassing
    // the usual string->object resolution every other Pokemon source goes through.
    GUEST_STARTER_PIKACHU_FIXTURE.allMoves.forEach((move) => {
      expect(typeof move.basePower).toBe("number")
      expect(typeof move.category).toBe("string")
    })
    expect(GUEST_STARTER_PIKACHU_FIXTURE.forms.Pikachu.allMoves).toEqual(GUEST_STARTER_PIKACHU_FIXTURE.allMoves)
  })

  test("moveset is the equipped 4-move set", () => {
    expect(GUEST_STARTER_PIKACHU_FIXTURE.moveset.map((m) => m.name)).toEqual([
      "Volt Tackle", "Thunderbolt", "Iron Tail", "Quick Attack",
    ])
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
