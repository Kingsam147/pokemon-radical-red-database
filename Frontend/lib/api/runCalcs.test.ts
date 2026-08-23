import { describe, test, expect, vi, beforeEach } from "vitest"
import type { Dispatch, SetStateAction } from "react"
import type { Pokemon, PokemonMove, PokemonStats, DamageResult } from "@/lib/utils/types"
import type { Hazards } from "@/lib/hooks/useBattleField"

vi.mock("@/lib/api/misc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/misc")>()
  return {
    ...actual,
    postDamageCalc: vi.fn(),
    fetchCalculateDamageBatch: vi.fn(),
  }
})

import { runCalc, runAllCalcs } from "@/lib/api/runCalcs"
import { postDamageCalc, fetchCalculateDamageBatch } from "@/lib/api/misc"

const stats: PokemonStats = { HP: 100, Atk: 100, Def: 100, SpA: 100, SpD: 100, Spe: 100 }

const buildMove = (name: string): PokemonMove => ({ name, basePower: 80, type: "Normal", category: "Physical" })

const buildPokemon = (name: string, moveNames: string[]): Pokemon => ({
  name,
  ID: name,
  sprite: "sprite-url",
  type1: { name: "Normal" },
  type2: { name: "Normal" },
  types: [{ name: "Normal" }],
  forms: {},
  level: 50,
  nature: { name: "Hardy", increase: "Atk", decrease: "Atk" },
  item: { name: "None" },
  ability: { name: "Levitate", description: "", toggle: false, toggledOn: false },
  abilities: [],
  baseStats: stats,
  EVs: stats,
  IVs: stats,
  maxHp: 150,
  currentHp: 150,
  finalStats: stats,
  moveset: moveNames.map(buildMove),
  allMoves: [],
  gender: "N",
  femaleSprite: false,
  status: "Healthy",
  switchInScore: 0,
} as unknown as Pokemon)

const noHazards: Hazards = {
  spikes: 0, tSpikes: 0, sRock: false, reflect: false, lightScreen: false,
  protect: false, stickyWebs: false, leechSeed: false, helpingHand: false,
  tailWind: false, flowerGift: false, friendGuard: false, auroraVeil: false,
  switchingOut: false,
} as Hazards

const fakeResult = (label: string): DamageResult => ({ range: ["49%", "57%"], damage: [80], description: label })

const commonArgs = (p1: Pokemon, p2: Pokemon) => ({
  player1Bench: [p1, null, null, null, null, null] as (Pokemon | null)[],
  player2Bench: [p2, null, null, null, null, null] as (Pokemon | null)[],
  p1Hazards: noHazards,
  p2Hazards: noHazards,
  activeEffects: [] as string[],
  battleMode: "singles" as const,
  abilityToggles: {},
  moveCrits: {},
  moveZPowered: {},
})

describe("runCalc", () => {
  let setDamageResults: ReturnType<typeof vi.fn<Dispatch<SetStateAction<Record<string, DamageResult | null>>>>>
  let setCalcLoadingKeys: ReturnType<typeof vi.fn<Dispatch<SetStateAction<Set<string>>>>>

  beforeEach(() => {
    vi.clearAllMocks()
    setDamageResults = vi.fn()
    setCalcLoadingKeys = vi.fn()
  })

  test("cache miss calls postDamageCalc once and caches the result for next time", async () => {
    const p1 = buildPokemon("Runcalc-Attacker-A", ["Ember"])
    const p2 = buildPokemon("Runcalc-Defender-A", ["Tackle"])
    const args = commonArgs(p1, p2)
    const result = fakeResult("first calc")
    vi.mocked(postDamageCalc).mockResolvedValue({ calculation: result })

    await runCalc(1, 0, 0, p1, args.player1Bench, args.player2Bench, args.p1Hazards, args.p2Hazards, args.activeEffects, args.battleMode, args.abilityToggles, args.moveCrits, args.moveZPowered, setDamageResults, setCalcLoadingKeys)

    expect(postDamageCalc).toHaveBeenCalledTimes(1)
    expect(setDamageResults).toHaveBeenCalled()
    const updater = setDamageResults.mock.calls[0][0] as (prev: Record<string, DamageResult | null>) => Record<string, DamageResult | null>
    expect(updater({})).toEqual({ "p1-0-move0": result })

    // Second call with the identical matchup must hit the cache, not the network.
    await runCalc(1, 0, 0, p1, args.player1Bench, args.player2Bench, args.p1Hazards, args.p2Hazards, args.activeEffects, args.battleMode, args.abilityToggles, args.moveCrits, args.moveZPowered, setDamageResults, setCalcLoadingKeys)
    expect(postDamageCalc).toHaveBeenCalledTimes(1)
  })

  test("skips the call entirely when there is no defender or the move slot is empty", async () => {
    const p1 = buildPokemon("Runcalc-Attacker-B", ["None"])
    const args = commonArgs(p1, p1)
    args.player2Bench = [null, null, null, null, null, null]

    await runCalc(1, 0, 0, p1, args.player1Bench, args.player2Bench, args.p1Hazards, args.p2Hazards, args.activeEffects, args.battleMode, args.abilityToggles, args.moveCrits, args.moveZPowered, setDamageResults, setCalcLoadingKeys)

    expect(postDamageCalc).not.toHaveBeenCalled()
    expect(setDamageResults).not.toHaveBeenCalled()
  })
})

describe("runAllCalcs", () => {
  let setDamageResults: ReturnType<typeof vi.fn<Dispatch<SetStateAction<Record<string, DamageResult | null>>>>>
  let setCalcLoadingKeys: ReturnType<typeof vi.fn<Dispatch<SetStateAction<Set<string>>>>>

  beforeEach(() => {
    vi.clearAllMocks()
    setDamageResults = vi.fn()
    setCalcLoadingKeys = vi.fn()
  })

  test("bundles every move on both sides into a single batch request", async () => {
    const p1 = buildPokemon("Runallcalcs-Attacker-A", ["Flamethrower", "Air Slash"])
    const p2 = buildPokemon("Runallcalcs-Defender-A", ["Surf", "Ice Beam"])
    const args = commonArgs(p1, p2)
    vi.mocked(fetchCalculateDamageBatch).mockResolvedValue([
      { key: "p1-0-move0", calculation: fakeResult("p1 move0") },
      { key: "p1-0-move1", calculation: fakeResult("p1 move1") },
      { key: "p2-0-move0", calculation: fakeResult("p2 move0") },
      { key: "p2-0-move1", calculation: fakeResult("p2 move1") },
    ])

    await runAllCalcs(args.player1Bench, args.player2Bench, args.p1Hazards, args.p2Hazards, args.activeEffects, args.battleMode, args.abilityToggles, args.moveCrits, args.moveZPowered, setDamageResults, setCalcLoadingKeys)

    expect(fetchCalculateDamageBatch).toHaveBeenCalledTimes(1)
    const batchItems = vi.mocked(fetchCalculateDamageBatch).mock.calls[0][0]
    expect(batchItems.map(item => item.key)).toEqual(["p1-0-move0", "p1-0-move1", "p2-0-move0", "p2-0-move1"])
    expect(postDamageCalc).not.toHaveBeenCalled()
  })

  test("a matchup already resolved by runCalc is served from cache with no batch request", async () => {
    const p1 = buildPokemon("Runallcalcs-Attacker-B", ["Earthquake"])
    const p2 = buildPokemon("Runallcalcs-Defender-B", ["None"])
    const args = commonArgs(p1, p2)
    vi.mocked(postDamageCalc).mockResolvedValue({ calculation: fakeResult("prewarmed") })

    await runCalc(1, 0, 0, p1, args.player1Bench, args.player2Bench, args.p1Hazards, args.p2Hazards, args.activeEffects, args.battleMode, args.abilityToggles, args.moveCrits, args.moveZPowered, setDamageResults, setCalcLoadingKeys)

    await runAllCalcs(args.player1Bench, args.player2Bench, args.p1Hazards, args.p2Hazards, args.activeEffects, args.battleMode, args.abilityToggles, args.moveCrits, args.moveZPowered, setDamageResults, setCalcLoadingKeys)

    expect(fetchCalculateDamageBatch).not.toHaveBeenCalled()
  })

  test("a per-item batch failure does not block the other results from being cached and set", async () => {
    const p1 = buildPokemon("Runallcalcs-Attacker-C", ["Good Move", "Bad Move"])
    const p2 = buildPokemon("Runallcalcs-Defender-C", ["None"])
    const args = commonArgs(p1, p2)
    vi.mocked(fetchCalculateDamageBatch).mockResolvedValue([
      { key: "p1-0-move0", calculation: fakeResult("good") },
      { key: "p1-0-move1", error: "Move \"Bad Move\" not found in database" },
    ])

    await runAllCalcs(args.player1Bench, args.player2Bench, args.p1Hazards, args.p2Hazards, args.activeEffects, args.battleMode, args.abilityToggles, args.moveCrits, args.moveZPowered, setDamageResults, setCalcLoadingKeys)

    const lastUpdater = setDamageResults.mock.calls[setDamageResults.mock.calls.length - 1][0] as (prev: Record<string, DamageResult | null>) => Record<string, DamageResult | null>
    const applied = lastUpdater({})
    expect(applied["p1-0-move0"]).toEqual(fakeResult("good"))
    expect(applied["p1-0-move1"]).toBeUndefined()
  })
})
