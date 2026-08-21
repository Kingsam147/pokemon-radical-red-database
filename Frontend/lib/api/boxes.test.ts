import { describe, test, expect } from "vitest"
import { resolveSingleBox } from "@/lib/api/boxes"
import type { Abilities, Items, Natures, PokemonMove, PokemonMoves, PokemonTypes, PokemonType, RawBox } from "@/lib/utils/types"

// This raw shape mirrors exactly what the Backend actually sends: HydrationService.hydrate()
// (Backend/pokemon/HydrationService.js) already resolves ability_id -> ability (a string) and
// type1/type2 -> type strings, but moveset/allMoves stay as arrays of move-NAME strings — full
// move objects only get attached here on the frontend. This test exists to pin that boundary:
// by the time a Pokemon reaches battle-calc code (e.g. runCalcs.ts's fetchCalculateDamage call),
// ability and moveset must be resolved objects, not raw strings/ids.
const buildType = (name: string): PokemonType => ({
  name,
  Normal: 1, Fire: 1, Water: 1, Eletric: 1, Grass: 1, Ice: 1, Fighting: 1, Poison: 1,
  Ground: 1, Flying: 1, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 1, Fairy: 1,
})

const abilityList: Abilities = {
  Blaze: { name: "Blaze", description: "Powers up Fire moves at low HP.", toggle: false, toggledOn: false },
  "Speed Boost": { name: "Speed Boost", description: "Raises Speed each turn.", toggle: false, toggledOn: false },
}

const itemsList: Items = {
  "Wide Lens": { name: "Wide Lens" },
}

const naturesList: Natures = {
  Jolly: { name: "Jolly", increase: "Spe", decrease: "SpA" },
}

const movesList: PokemonMoves = {
  highjumpkick: { name: "High Jump Kick", basePower: 130, type: "Fighting", category: "Physical" },
  blazekick: { name: "Blaze Kick", basePower: 85, type: "Fire", category: "Physical" },
  bravebird: { name: "Brave Bird", basePower: 120, type: "Flying", category: "Physical" },
  detect: { name: "Detect", basePower: 0, type: "Normal", category: "Status" },
}

const typeList: PokemonTypes = {
  Fire: buildType("Fire"),
  Fighting: buildType("Fighting"),
}

const rawBox: RawBox = {
  Blaziken: {
    name: "Blaziken", form: "Blaziken", ID: 257, sprite: "sprite-url", femaleSprite: false,
    type1: "Fire", type2: "Fighting", gender: "N", level: 50, nature: "Jolly", item: "Wide Lens",
    ability: "Speed Boost", abilities: ["Blaze", "Speed Boost"],
    baseStats: { HP: 80, Atk: 120, Def: 70, SpA: 110, SpD: 70, Spe: 80 },
    EVs: { HP: 0, Atk: 252, Def: 0, SpA: 0, SpD: 0, Spe: 252 },
    IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
    finalStats: { HP: 152, Atk: 187, Def: 96, SpA: 168, SpD: 96, Spe: 156 },
    // Raw, unhydrated: move NAMES, not move objects — exactly what the Backend actually sends.
    moveset: ["High Jump Kick", "Blaze Kick", "Brave Bird", "Detect"],
    allMoves: ["Blaze Kick", "Detect"],
    forms: {
      Blaziken: {
        formName: "Blaziken", ID: 257, sprite: "sprite-url", type1: "Fire", type2: "Fighting",
        ability: "Blaze", abilities: ["Blaze", "Speed Boost"],
        baseStats: { HP: 80, Atk: 120, Def: 70, SpA: 110, SpD: 70, Spe: 80 },
        finalStats: { HP: 152, Atk: 187, Def: 96, SpA: 168, SpD: 96, Spe: 156 },
        allMoves: ["Blaze Kick", "Detect"],
      },
    },
  },
}

describe("resolveSingleBox hydration", () => {
  const resolved = resolveSingleBox(rawBox, abilityList, itemsList, naturesList, movesList, typeList)
  const blaziken = resolved.Blaziken!

  test("ability is a resolved object, not a raw string", () => {
    expect(typeof blaziken.ability).toBe("object")
    expect(blaziken.ability.name).toBe("Speed Boost")
  })

  test("moveset entries are resolved move objects with real fields, not name strings", () => {
    expect(blaziken.moveset).toHaveLength(4)
    blaziken.moveset.forEach((move) => {
      expect(typeof move).toBe("object")
      expect(typeof move.name).toBe("string")
    })
    expect(blaziken.moveset[0]).toMatchObject({ name: "High Jump Kick", basePower: 130, type: "Fighting" })
    expect(blaziken.moveset[1]).toMatchObject({ name: "Blaze Kick", basePower: 85, type: "Fire" })
  })

  test("spreading a moveset entry (as runCalcs.ts does for the damage-calc request) yields real move fields", () => {
    // This is exactly what Frontend/lib/api/runCalcs.ts:69 does before sending a move to the
    // damage-calc API: { ...pokemon.moveset[idx], isCrit, isZ }. If moveset were still raw
    // strings, spreading would produce indexed characters ({0: 'H', 1: 'i', ...}) instead of a
    // move object — this assertion is what actually catches that regression.
    const spread: PokemonMove = { ...blaziken.moveset[0], isCrit: false, isZ: false }
    expect(spread.basePower).toBe(130)
    expect(spread.type).toBe("Fighting")
    expect(spread[0]).toBeUndefined()
  })

  test("type1/type2 and abilities list are resolved objects too", () => {
    expect(blaziken.type1.name).toBe("Fire")
    expect(blaziken.type2.name).toBe("Fighting")
    expect(blaziken.abilities.every((a) => typeof a === "object")).toBe(true)
  })
})
