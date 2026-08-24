import { describe, test, expect, vi } from "vitest"

vi.mock("@/lib/infrastructure/apiClient", () => ({
  default: { get: vi.fn() },
}))

import apiClient from "@/lib/infrastructure/apiClient"
import { loadGuestStarterPikachu } from "@/lib/api/guestStarterPikachu"

describe("loadGuestStarterPikachu", () => {
  test("resolves the fetched raw Pokemon into a full Pokemon object", async () => {
    const rawPokemon = {
      name: "Pikachu", ID: 25, sprite: "sprite-url", femaleSprite: false, gender: "M",
      level: 8, item: { name: "Light Ball" }, nature: { name: "Naughty", increase: "Atk", decrease: "SpD" },
      ability: { name: "Lightning Rod", description: "", toggle: false },
      abilities: [{ name: "Static", description: "", toggle: false }, { name: "Lightning Rod", description: "", toggle: false }],
      type1: { name: "Electric" }, type2: { name: "None" },
      baseStats: { HP: 35, Atk: 55, Def: 40, SpA: 50, SpD: 50, Spe: 90 },
      EVs: { HP: 0, Atk: 252, Def: 0, SpA: 0, SpD: 0, Spe: 252 },
      IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
      finalStats: { HP: 26, Atk: 23, Def: 13, SpA: 15, SpD: 13, Spe: 26 },
      moveset: [{ name: "Volt Tackle", basePower: 120, category: "Physical", type: "Electric" }],
      allMoves: ["Thunderbolt"],
      form: "Pikachu",
      forms: { Pikachu: { formName: "Pikachu", ID: 25, baseStats: { HP: 35, Atk: 55, Def: 40, SpA: 50, SpD: 50, Spe: 90 }, finalStats: { HP: 26, Atk: 23, Def: 13, SpA: 15, SpD: 13, Spe: 26 }, ability: { name: "Lightning Rod", description: "", toggle: false }, abilities: [], allMoves: ["Thunderbolt"], type1: { name: "Electric" }, type2: { name: "None" } } },
    }
    vi.mocked(apiClient.get).mockResolvedValue({ data: { pokemon: rawPokemon } })

    const movesList = { thunderbolt: { name: "Thunderbolt", basePower: 90, category: "Special", type: "Electric" } }
    const pokemon = await loadGuestStarterPikachu(movesList)

    expect(pokemon).not.toBeNull()
    expect(pokemon!.name).toBe("Pikachu")
    expect(pokemon!.level).toBe(8)
    expect(pokemon!.currentHp).toBe(26)
    expect(pokemon!.moveset[0].name).toBe("Volt Tackle")
    expect(pokemon!.sprite).toBe("https://pokemon-radical-red.s3.us-east-2.amazonaws.com/pokemon/25.png")
    expect(pokemon!.allMoves).toEqual([{ name: "Thunderbolt", basePower: 90, category: "Special", type: "Electric" }])
  })

  test("falls back to a bare { name } move when the moves list hasn't loaded yet", async () => {
    const rawPokemon = {
      name: "Pikachu", ID: 25, sprite: "sprite-url", femaleSprite: false, gender: "M",
      level: 8, item: { name: "Light Ball" }, nature: { name: "Naughty", increase: "Atk", decrease: "SpD" },
      ability: { name: "Lightning Rod", description: "", toggle: false },
      abilities: [{ name: "Static", description: "", toggle: false }, { name: "Lightning Rod", description: "", toggle: false }],
      type1: { name: "Electric" }, type2: { name: "None" },
      baseStats: { HP: 35, Atk: 55, Def: 40, SpA: 50, SpD: 50, Spe: 90 },
      EVs: { HP: 0, Atk: 252, Def: 0, SpA: 0, SpD: 0, Spe: 252 },
      IVs: { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 },
      finalStats: { HP: 26, Atk: 23, Def: 13, SpA: 15, SpD: 13, Spe: 26 },
      moveset: [{ name: "Volt Tackle", basePower: 120, category: "Physical", type: "Electric" }],
      allMoves: ["Thunderbolt"],
      form: "Pikachu",
      forms: { Pikachu: { formName: "Pikachu", ID: 25, baseStats: { HP: 35, Atk: 55, Def: 40, SpA: 50, SpD: 50, Spe: 90 }, finalStats: { HP: 26, Atk: 23, Def: 13, SpA: 15, SpD: 13, Spe: 26 }, ability: { name: "Lightning Rod", description: "", toggle: false }, abilities: [], allMoves: ["Thunderbolt"], type1: { name: "Electric" }, type2: { name: "None" } } },
    }
    vi.mocked(apiClient.get).mockResolvedValue({ data: { pokemon: rawPokemon } })

    const pokemon = await loadGuestStarterPikachu()

    expect(pokemon!.allMoves).toEqual([{ name: "Thunderbolt" }])
  })

  test("returns null when the request fails", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error("network error"))

    const pokemon = await loadGuestStarterPikachu()

    expect(pokemon).toBeNull()
  })
})
