import { describe, test, expect } from "vitest"
import { resolveEnemyTeam } from "@/lib/api/teams"
import type { RawTeam, PokemonType } from "@/lib/utils/types"

const TYPE = { name: "Grass" } as unknown as PokemonType
const TYPE_POISON = { name: "Poison" } as unknown as PokemonType

function buildRawTeam(): RawTeam {
  const abilityObj = { name: "Overgrow", description: "", toggle: false, toggledOn: false }
  const baseStats = { HP: 45, Atk: 49, Def: 49, SpA: 65, SpD: 65, Spe: 45 }
  const finalStats = { HP: 21, Atk: 11, Def: 11, SpA: 13, SpD: 13, Spe: 11 }

  return {
    Bulbasaur: {
      name: "Bulbasaur",
      ID: 1,
      type1: TYPE,
      type2: TYPE_POISON,
      level: 5,
      nature: { name: "Bashful", increase: "Spe", decrease: "Spe" },
      item: { name: "None" },
      ability: abilityObj,
      abilities: [abilityObj],
      baseStats,
      EVs: { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
      IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
      finalStats,
      moveset: [{ name: "Tackle", basePower: 40, category: "Physical", type: "Normal" }],
      allMoves: [],
      form: "Bulbasaur",
      forms: {
        // Two forms with different IDs — regression coverage for the sprite
        // gap: resolveEnemyTeam used to leave form.sprite untouched entirely.
        Bulbasaur: { formName: "Bulbasaur", ID: 1, baseStats, finalStats, ability: abilityObj, abilities: [abilityObj], allMoves: [], type1: TYPE, type2: { name: "Poison" } as unknown as typeof TYPE },
        BulbasaurMega: { formName: "BulbasaurMega", ID: 1001, baseStats, finalStats, ability: abilityObj, abilities: [abilityObj], allMoves: [], type1: TYPE, type2: { name: "Poison" } as unknown as typeof TYPE },
      },
      gender: "Both",
      femaleSprite: false,
    },
    trainerInfo: { name: "Test Trainer", rules: "", format: "Singles", partner: "", myPartner: "" },
  } as unknown as RawTeam
}

describe("resolveEnemyTeam", () => {
  test("sets the top-level sprite from the S3 pokemon/{ID}.png convention", () => {
    const resolved = resolveEnemyTeam(buildRawTeam(), {}, {}, {}, {}, {})
    const bulbasaur = resolved.Bulbasaur as { sprite: string }

    expect(bulbasaur.sprite).toBe("https://pokemon-radical-red.s3.us-east-2.amazonaws.com/pokemon/1.png")
  })

  test("sets each alternate form's sprite too, keyed by that form's own ID", () => {
    const resolved = resolveEnemyTeam(buildRawTeam(), {}, {}, {}, {}, {})
    const bulbasaur = resolved.Bulbasaur as { forms: Record<string, { sprite: string }> }

    expect(bulbasaur.forms.Bulbasaur.sprite).toBe("https://pokemon-radical-red.s3.us-east-2.amazonaws.com/pokemon/1.png")
    expect(bulbasaur.forms.BulbasaurMega.sprite).toBe("https://pokemon-radical-red.s3.us-east-2.amazonaws.com/pokemon/1001.png")
  })
})
