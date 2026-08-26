"use client"

import { useEffect, useState } from "react"
import { Pokemon, Teams, Box, TrainerInfo, Abilities, Items, Natures, PokemonMoves, PokemonTypes, PokemonStatuses } from "@/lib/utils/types.ts"
import { addPokemon, fetchBoxCount, loadSingleBox, resolveSingleBox } from "@/lib/api/boxes"
import { MOVES_OPTIONS, ABILITY_OPTIONS, ITEMS_OPTIONS, NATURE_OPTIONS, TYPE_OPTIONS, STATUS_OPTIONS, MISC_VERSION } from "@/lib/api/misc"
import { loadMyTeams, loadEnemyTeams, removeTeam, saveFullTeam } from "@/lib/api/teams"
import { isUnsavedP1Selection } from "@/lib/utils/guestStarterPikachuGuards"
import { GUEST_STARTER_PIKACHU_FIXTURE, hydrateAllMoves } from "@/lib/data/guestStarterPikachuFixture"
import { ENEMY_PREVIEW_FIXTURE } from "@/lib/data/enemyPreviewFixture"
import { readMiscCache, writeMiscCache } from "@/lib/cache/miscCache"
import { useAuth0 } from "@auth0/auth0-react"
import { toast } from "sonner"
import apiClient from "@/lib/infrastructure/apiClient"

import ImportModal from "@/components/importModal"
import ToolSidebar from "@/components/toolSidebar"
import Header from "@/components/header"
import TurnEditor from "@/components/turnEditor"
import TeamBench from "@/components/teamBench"
import PokemonBox from "@/components/PokemonBox/pokemonBox"
import TeamBenchSkeleton from "@/components/skeletons/TeamBenchSkeleton"
import PokemonBoxSkeleton from "@/components/skeletons/PokemonBoxSkeleton"

import { useBattleOptions } from "@/lib/hooks/useBattleOptions"
import { useBoxManager } from "@/lib/hooks/useBoxManager"
import { useTeamManager } from "@/lib/hooks/useTeamManager"
import { useBattleField } from "@/lib/hooks/useBattleField"
import { useBench } from "@/lib/hooks/useBench"
import { useUIState } from "@/lib/hooks/useUIState"

// Stable box key the hardcoded guest-starter Pikachu occupies in box 0, so the
// same slot can be found/reset whether the read comes from the bench (boxKey)
// or from boxManager.p1Boxes/originalPokemon directly.
const GUEST_PIKACHU_BOX_KEY = "guestStarterPikachu"

export default function PokemonBattleSimulator() {
  const { isAuthenticated, isLoading } = useAuth0()
  const [isP1Loading, setIsP1Loading] = useState(true)
  const [isP2Loading, setIsP2Loading] = useState(true)

  const options = useBattleOptions()
  const boxManager = useBoxManager({
    abilityOptions: options.abilityOptions,
    itemOptions: options.itemOptions,
    natureOptions: options.natureOptions,
    movesOptions: options.movesOptions,
    typesOptions: options.typesOptions,
  })
  const teams = useTeamManager()
  const field = useBattleField()
  const bench = useBench({
    statusOptions: options.statusOptions,
    natureOptions: options.natureOptions,
    itemOptions: options.itemOptions,
  })
  const ui = useUIState()

  // on initial load
  useEffect(() => {
    if (isLoading) return

    // Hardcoded fast paths: both the enemy preview and the guest starter
    // Pikachu are baked directly into the frontend (see Frontend/lib/data)
    // so they paint immediately, with zero round trips to the backend. The
    // full pipeline below is still authoritative and overwrites these once
    // it resolves. Deferred a microtask (same pattern the old promise-based
    // fast paths used) so state isn't set synchronously in the effect body.
    const guestBoxPikachu: Pokemon = { ...GUEST_STARTER_PIKACHU_FIXTURE, boxKey: GUEST_PIKACHU_BOX_KEY, boxIndex: 0 }

    Promise.resolve().then(() => {
      const previewSlots = Object.entries(ENEMY_PREVIEW_FIXTURE.team)
        .filter(([k, v]) => k !== "trainerInfo" && v !== null)
        .map(([_, v]) => v as Pokemon)
      const previewBench: (Pokemon | null)[] = Array(6).fill(null)
      previewSlots.forEach((p, i) => { previewBench[i] = p })
      bench.setPlayer2Bench(previewBench)
      teams.setP2Teams((prev) => ({ ...prev, [ENEMY_PREVIEW_FIXTURE.teamName]: ENEMY_PREVIEW_FIXTURE.team }))
      teams.setP2SelectedTeamIndex(ENEMY_PREVIEW_FIXTURE.teamName)
      setIsP2Loading(false)

      if (!isAuthenticated) {
        bench.setPlayer1Bench([guestBoxPikachu, null, null, null, null, null])
        boxManager.setP1Boxes((prev) => {
          const updated = [...prev]
          updated[0] = { ...(updated[0] ?? {}), [GUEST_PIKACHU_BOX_KEY]: guestBoxPikachu }
          return updated
        })
        boxManager.setOriginalPokemon((prev) => ({ ...prev, [GUEST_PIKACHU_BOX_KEY]: guestBoxPikachu }))
        // Display-only label for the P1 team selector — intentionally NOT added
        // to teams.p1Teams, since that dict backs real saved/deletable teams.
        // isUnsavedP1Selection (used by deleteP1Team) treats any selected index
        // with no matching teams.p1Teams entry as "nothing real is selected,"
        // so "Clear Team" never calls the backend DELETE endpoint for this
        // synthetic label.
        teams.setP1SelectedTeamIndex("Example Pikachu Team")
        setIsP1Loading(false)
      }
    })

    async function loadInitialData() {
      try {
        let abilityList: Abilities
        let itemsList: Items
        let naturesList: Natures
        let movesList: PokemonMoves
        let typesList: PokemonTypes
        let statusList: PokemonStatuses

        const version = await MISC_VERSION().catch(() => null)
        const cached = version ? readMiscCache(version) : null

        if (cached) {
          abilityList = cached.abilities
          itemsList = cached.items
          naturesList = cached.natures
          movesList = cached.moves
          typesList = cached.types
          statusList = cached.statuses
        } else {
          [abilityList, itemsList, naturesList, movesList, typesList, statusList] = await Promise.all([
            ABILITY_OPTIONS(),
            ITEMS_OPTIONS(),
            NATURE_OPTIONS(),
            MOVES_OPTIONS(),
            TYPE_OPTIONS(),
            STATUS_OPTIONS(),
          ])
          if (version) {
            writeMiscCache(version, {
              abilities: abilityList,
              items: itemsList,
              natures: naturesList,
              moves: movesList,
              types: typesList,
              statuses: statusList,
            })
          }
        }

        options.setAbilityOptions(abilityList)
        options.setItemOptions(itemsList)
        options.setNatureOptions(naturesList)
        options.setMovesOptions(movesList)
        options.setTypesOptions(typesList)
        options.setStatusOptions(statusList)

        const boxCount = await fetchBoxCount()
        const savedNames = JSON.parse(localStorage.getItem("p1BoxNames") || "[]")
        const defaultNames = Array.from({ length: boxCount }, (_, i) =>
          savedNames[i] ?? (i === 0 && !isAuthenticated ? "Starter Pikachu Box" : `Box ${i + 1}`)
        )
        boxManager.setP1BoxNames(defaultNames)
        // Guests never persist box names — the "Starter Pikachu Box" label is
        // onboarding-only and must never leak into a real saved name.
        if (isAuthenticated) {
          localStorage.setItem("p1BoxNames", JSON.stringify(defaultNames))
        }

        // Initialize placeholders then eagerly load only box 0
        const placeholders: (Box | null)[] = new Array(boxCount).fill(null)
        boxManager.setP1Boxes(placeholders)
        if (boxCount > 0) {
          const box0 = await loadSingleBox(0, abilityList, itemsList, naturesList, movesList, typesList)
          boxManager.setP1Boxes(prev => {
            const updated = [...prev]
            updated[0] = !isAuthenticated
              ? { ...box0, [GUEST_PIKACHU_BOX_KEY]: guestBoxPikachu }
              : box0
            return updated
          })
          if (boxCount > 1) {
            boxManager.prefetchRemainingBoxes(boxCount)
          }
        }

        // The guest Pikachu was seeded with unhydrated {name}-only allMoves
        // stubs (no network call needed to show it). Now that movesOptions
        // has loaded — a fetch the app needs regardless of this Pokemon, not
        // one made on its behalf — upgrade allMoves to fully-resolved move
        // objects in place. Reads the latest state via functional updaters
        // and no-ops if the guest already removed/replaced it.
        if (!isAuthenticated) {
          bench.setPlayer1Bench((prev) => prev.map((p) =>
            p?.boxKey === GUEST_PIKACHU_BOX_KEY ? hydrateAllMoves(p, movesList) : p
          ))
          boxManager.setP1Boxes((prev) => {
            const box0 = prev[0]
            const current = box0?.[GUEST_PIKACHU_BOX_KEY]
            if (!current) return prev
            const updated = [...prev]
            updated[0] = { ...box0, [GUEST_PIKACHU_BOX_KEY]: hydrateAllMoves(current, movesList) }
            return updated
          })
          boxManager.setOriginalPokemon((prev) => {
            const current = prev[GUEST_PIKACHU_BOX_KEY]
            if (!current) return prev
            return { ...prev, [GUEST_PIKACHU_BOX_KEY]: hydrateAllMoves(current, movesList) }
          })
        }

        const resolvedP1Teams = await loadMyTeams(abilityList, itemsList, naturesList, movesList, typesList)
        teams.setP1Teams(resolvedP1Teams)
        setIsP1Loading(false)

        const resolvedP2Teams: Teams = await loadEnemyTeams(abilityList, itemsList, naturesList, movesList, typesList)
        teams.setP2Teams(resolvedP2Teams)
        teams.setP2OriginalTeams(JSON.parse(JSON.stringify(resolvedP2Teams)))

        const firstTeamKey = Object.keys(resolvedP2Teams)[0]
        if (firstTeamKey) {
          teams.setP2SelectedTeamIndex(firstTeamKey)
          const firstTeam = resolvedP2Teams[firstTeamKey]
          const slots = Object.entries(firstTeam)
            .filter(([k, v]) => k !== "trainerInfo" && v !== null)
            .map(([_, v]) => v as Pokemon)
          const initialBench: (Pokemon | null)[] = Array(6).fill(null)
          slots.forEach((p, i) => { initialBench[i] = p })
          bench.setPlayer2Bench(initialBench)
        }
        setIsP2Loading(false)
      } catch (err) {
        toast.error(`Failed to load data: ${err}`)
      } finally {
        // Safety net for the error path and for authenticated users, who
        // never get the early guest-only flip above.
        setIsP1Loading(false)
      }
    }

    const run = async () => {
      // Best-effort: guest_id cookie minting shouldn't block the rest of
      // the pipeline. Without this catch, any failure here (rate limit,
      // network blip, cold start) threw unhandled and skipped
      // loadInitialData() entirely, breaking the whole page for the guest.
      if (!isAuthenticated) {
        await apiClient.get("/api/guest/init").catch(() => {})
      } else {
        await apiClient.post("/api/auth/migrate").catch(() => {})
      }
      await loadInitialData()
    }

    run()
  }, [isLoading, isAuthenticated])

  // --- cross-cutting handlers ---

  const handleTeamChange = (player: 1 | 2, teamName: string) => {
    if (player === 1) {
      teams.setP1SelectedTeamIndex(teamName)
      const team = teams.p1Teams[teamName]
      if (team) {
        bench.player1Bench.forEach((_, index) => removePokemonFromBench(1, index))
        bench.setPlayer1Bench(team.slice(0, 6))
      }
    } else {
      if (teams.p2SelectedTeamIndex && teams.p2OriginalTeams[teams.p2SelectedTeamIndex]) {
        teams.setP2Teams(prev => ({
          ...prev,
          [teams.p2SelectedTeamIndex]: JSON.parse(JSON.stringify(teams.p2OriginalTeams[teams.p2SelectedTeamIndex]))
        }))
      }
      teams.setP2SelectedTeamIndex(teamName)
      const originalTeam = teams.p2OriginalTeams[teamName]
      const trainerInfo = teams.p2OriginalTeams[teamName].trainerInfo as TrainerInfo
      if (trainerInfo && trainerInfo.format === "Doubles") {
        field.setBattleMode("doubles")
        if (trainerInfo.partner !== "True") {
          field.setDoublesType("Partner")
        } else {
          field.setDoublesType("True")
        }
      } else {
        field.setBattleMode("singles")
        field.setDoublesType("None")
      }
      if (originalTeam) {
        const slots = Object.entries(originalTeam)
          .filter(([k, v]) => k !== "trainerInfo" && v !== null)
          .map(([_, v]) => v as Pokemon)
        const newBench: (Pokemon | null)[] = Array(6).fill(null)
        slots.forEach((p, i) => { newBench[i] = p })
        bench.setPlayer2Bench(newBench)
      }
    }
  }

  const saveCurrentTeam = async () => {
    const name = window.prompt("Enter a name for this team")
    if (!name) return
    try {
      await saveFullTeam("1", name, bench.player1Bench)
      teams.setP1Teams(prev => ({ ...prev, [name]: bench.player1Bench }))
      teams.setP1SelectedTeamIndex(name)
    } catch (err) {
      toast.error(`Failed to save team: ${err}`)
    }
  }

  const deleteP1Team = async () => {
    // A selected index with no matching teams.p1Teams entry isn't a real
    // saved team — this is the case for the guest starter Pikachu's
    // "Example Pikachu Team" label. Treat it the same as nothing selected:
    // just clear the bench locally, don't call the backend DELETE endpoint
    // for a team that was never saved.
    if (isUnsavedP1Selection(teams.p1SelectedTeamIndex, teams.p1Teams)) {
      teams.setP1SelectedTeamIndex("")
      bench.setPlayer1Bench(Array(6).fill(null))
      return
    }
    if (!window.confirm(`Delete team "${teams.p1SelectedTeamIndex}"?`)) return
    try {
      await removeTeam("1", teams.p1SelectedTeamIndex)
      teams.setP1Teams(prev => {
        const updated = { ...prev }
        delete updated[teams.p1SelectedTeamIndex]
        return updated
      })
      teams.setP1SelectedTeamIndex("")
      bench.setPlayer1Bench(Array(6).fill(null))
    } catch (err) {
      toast.error(`Failed to delete team: ${err}`)
    }
  }

  const navigateP2Teams = (direction: "next" | "prev") => {
    const keys = Object.keys(teams.p2Teams)
    if (keys.length === 0) return
    let currentIndex = keys.indexOf(teams.p2SelectedTeamIndex)
    currentIndex = direction === "next"
      ? (currentIndex + 1) % keys.length
      : (currentIndex - 1 + keys.length) % keys.length

    if (teams.p2SelectedTeamIndex && teams.p2OriginalTeams[teams.p2SelectedTeamIndex]) {
      teams.setP2Teams(prev => ({
        ...prev,
        [teams.p2SelectedTeamIndex]: JSON.parse(JSON.stringify(teams.p2OriginalTeams[teams.p2SelectedTeamIndex]))
      }))
    }

    const newKey = keys[currentIndex]
    teams.setP2SelectedTeamIndex(newKey)
    const originalTeam = teams.p2OriginalTeams[newKey]
    const trainerInfo = originalTeam.trainerInfo as TrainerInfo
    if (trainerInfo && trainerInfo.format === "Doubles") {
      field.setBattleMode("doubles")
      if (trainerInfo.partner !== "True") {
        field.setDoublesType("Partner")
      } else {
        field.setDoublesType("True")
      }
    } else {
      field.setBattleMode("singles")
      field.setDoublesType("None")
    }
    if (originalTeam) {
      const slots = Object.entries(originalTeam)
        .filter(([k, v]) => k !== "trainerInfo" && v !== null)
        .map(([_, v]) => v as Pokemon)
      const newBench: (Pokemon | null)[] = Array(6).fill(null)
      slots.forEach((p, i) => { newBench[i] = p })
      bench.setPlayer2Bench(newBench)
      teams.setP2Teams(prev => ({
        ...prev,
        [newKey]: JSON.parse(JSON.stringify(originalTeam))
      }))
    } else {
      const team = teams.p2Teams[newKey]
      const slots = Object.entries(team)
        .filter(([k, v]) => k !== "trainerInfo" && v !== null)
        .map(([_, v]) => v as Pokemon)
      const newBench: (Pokemon | null)[] = Array(6).fill(null)
      slots.forEach((p, i) => { newBench[i] = p })
      bench.setPlayer2Bench(newBench)
    }
  }

  const removePokemonFromBench = async (player: 1 | 2, index: number) => {
    const setBench = player === 1 ? bench.setPlayer1Bench : bench.setPlayer2Bench
    const currentBench = player === 1 ? bench.player1Bench : bench.player2Bench
    const pokemon = currentBench[index]
    if (!pokemon) return

    if (player === 1) {
      const { boxIndex, boxKey } = pokemon
      if (boxKey !== undefined && boxIndex !== undefined) {
        const original = boxManager.originalPokemon[boxKey]
        const resetPokemon: Pokemon = original
          ? { ...original, currentHp: original.maxHp, status: options.statusOptions["Healthy"] }
          : { ...pokemon, currentHp: pokemon.maxHp, status: options.statusOptions["Healthy"], statBoosts: { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 } }
        boxManager.setP1Boxes(prev => {
          const updated = [...prev]
          const box = updated[boxIndex]
          if (!box) return prev
          updated[boxIndex] = { ...box, [boxKey]: resetPokemon }
          return updated
        })
        boxManager.setOriginalPokemon(prev => {
          const updated = { ...prev }
          delete updated[boxKey]
          return updated
        })
      }
    } else {
      const originalTeam = teams.p2OriginalTeams[teams.p2SelectedTeamIndex]
      if (originalTeam) {
        const originalEntry = Object.entries(originalTeam).find(
          ([_, p]) => (p as Pokemon)?.ID === pokemon.ID
        )
        if (originalEntry) {
          const [slotKey, originalPokemonEntry] = originalEntry
          teams.setP2Teams(prev => ({
            ...prev,
            [teams.p2SelectedTeamIndex]: {
              ...prev[teams.p2SelectedTeamIndex],
              [slotKey]: JSON.parse(JSON.stringify(originalPokemonEntry))
            }
          }))
        }
      }
    }

    const newBench = [...currentBench]
    newBench[index] = null
    setBench(newBench)
  }

  const togglePokemonInBench = async (pokemon: Pokemon, player: 1 | 2, boxKey?: string) => {
    const setBench = player === 1 ? bench.setPlayer1Bench : bench.setPlayer2Bench
    const currentBench = player === 1 ? bench.player1Bench : bench.player2Bench
    const isP1 = player === 1

    if (bench.isInBench(pokemon, player, boxKey)) {
      // Match by boxKey (the exact box slot this card came from) rather than
      // pokemon.ID (species ID), which collides whenever two Pokemon of the same
      // species exist -- e.g. the guest-starter Pikachu already benched and a
      // freshly imported real Pikachu still sitting in the box.
      const benchIndex = boxKey !== undefined
        ? currentBench.findIndex(p => p?.boxKey === boxKey)
        : currentBench.findIndex(p => p?.ID === pokemon.ID)
      if (benchIndex === -1) return

      if (pokemon.boxKey !== undefined && pokemon.boxIndex !== undefined && isP1) {
        const resetPokemon: Pokemon = {
          ...pokemon,
          currentHp: pokemon.maxHp,
          status: options.statusOptions["Healthy"],
          statBoosts: { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
        }
        boxManager.setP1Boxes(prev => {
          const updated = [...prev]
          const existingBox = updated[boxManager.activeBoxIndex]
          const newBox: Box = { ...(existingBox ?? {}) }
          newBox[pokemon.boxKey!] = resetPokemon
          updated[boxManager.activeBoxIndex] = newBox
          return updated
        })
      }

      const newBench = [...currentBench]
      newBench[benchIndex] = null
      setBench(newBench)
    } else {
      const emptySlot = currentBench.indexOf(null)
      if (emptySlot === -1) return

      const currentBox = boxManager.p1Boxes[boxManager.activeBoxIndex]
      if (!currentBox) return
      // Prefer the exact slot key the card was clicked from; only fall back to an
      // ID-based search (species-level, collision-prone) if it wasn't provided.
      const key = boxKey !== undefined && currentBox[boxKey] !== undefined
        ? boxKey
        : Object.entries(currentBox).find(([_, p]) => p?.ID === pokemon.ID)?.[0]
      if (!key) return

      setBench(prev => {
        const newBench = [...prev]
        newBench[emptySlot] = { ...pokemon, boxKey: key, boxIndex: boxManager.activeBoxIndex }
        return newBench
      })
      boxManager.setOriginalPokemon(prev => ({ ...prev, [key]: { ...pokemon, boxKey: key, boxIndex: boxManager.activeBoxIndex } }))
      if (isP1) {
        boxManager.setP1Boxes(prev => {
          const updated = [...prev]
          updated[boxManager.activeBoxIndex] = { ...updated[boxManager.activeBoxIndex], [key]: null }
          return updated
        })
      }
    }
  }

  const handleDropOnBench = (player: 1 | 2, index: number) => {
    if (!bench.draggedPokemon) return
    const source = bench.draggedPokemon.source
    const setTargetBench = player === 1 ? bench.setPlayer1Bench : bench.setPlayer2Bench

    if (source.startsWith("box-")) {
      const parts = source.split("-")
      const boxKey = parts.slice(2).join("-")
      setTargetBench((prev) => {
        const newBench = [...prev]
        newBench[index] = { ...bench.draggedPokemon!.pokemon, boxKey, boxIndex: parseInt(parts[1]) }
        return newBench
      })
      boxManager.setP1Boxes((prev) => {
        const updated = [...prev]
        const boxIdx = parseInt(parts[1])
        const existingBox = updated[boxIdx]
        if (!existingBox) return prev
        const newBox = { ...existingBox };
        newBox[boxKey] = null
        updated[boxIdx] = newBox
        return updated
      })
    } else {
      const oldIndex = parseInt(source.split("-")[2])
      setTargetBench((prev) => {
        const newBench = [...prev]
        const temp = newBench[index]
        newBench[index] = newBench[oldIndex]
        newBench[oldIndex] = temp
        return newBench
      })
    }
    bench.setDraggedPokemon(null)
  }

  const healTeam = () => {
    const heal = (p: Pokemon | null): Pokemon | null =>
      p ? { ...p, currentHp: p.maxHp, status: options.statusOptions["Healthy"] } : p
    bench.setPlayer1Bench((prev) => prev.map(heal))
    bench.setPlayer2Bench((prev) => prev.map(heal))
    const currentBox = boxManager.p1Boxes[boxManager.activeBoxIndex]
    if (currentBox) {
      const healBox: Box = {}
      Object.entries(currentBox).forEach(([key, pokemon]) => {
        healBox[key] = heal(pokemon) as Pokemon
      })
      boxManager.updateActiveBox(healBox)
    }
  }

  const handleImportModal = async (text: string) => {
    if (!text.trim()) return
    try {
      const result = await addPokemon(String(boxManager.activeBoxIndex), text)
      if (result.updatedBox) {
        const resolved = resolveSingleBox(
          result.updatedBox,
          options.abilityOptions, options.itemOptions, options.natureOptions,
          options.movesOptions, options.typesOptions
        )
        boxManager.setP1Boxes(prev => {
          const updated = [...prev]
          updated[boxManager.activeBoxIndex] = resolved
          return updated
        })
      }
      ui.setImportModalOpen(false)
    } catch (err) {
      toast.error(`Import failed: ${err}`)
    }
  }

  const handleRemovePokemonFromBox = async (boxIndex: number, pokemonName: string) => {
    await boxManager.removePokemonFromBox(boxIndex, pokemonName)
    ui.setRemoveMode(false)
  }

  const player1Active = field.battleMode !== "singles" ? bench.player1Bench[0] : [bench.player1Bench[0], bench.player1Bench[1]]
  const player2Active = field.battleMode !== "singles" ? bench.player2Bench[0] : [bench.player2Bench[0], bench.player2Bench[1]]

  return (
    <div className="flex h-screen">
      <ToolSidebar
        sidebarOpen={ui.sidebarOpen}
        setSidebarOpen={ui.setSidebarOpen}
        notes={ui.notes}
        setNotes={ui.setNotes}
      />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-4 space-y-6">
          <Header battleMode={field.battleMode} setBattleMode={field.setBattleMode} setSidebarOpen={ui.setSidebarOpen} />
          <TurnEditor healTeam={healTeam} player1Active={player1Active} player2Active={player2Active} />

          <div className="flex flex-row items-start justify-center w-full flex-nowrap">
            {isP1Loading ? (
              <TeamBenchSkeleton />
            ) : (
              <TeamBench
                player={1}
                teamNames={Object.keys(teams.p1Teams)}
                selectedTeamIndex={teams.p1SelectedTeamIndex}
                bench={bench.player1Bench}
                player1Bench={bench.player1Bench}
                player2Bench={bench.player2Bench}
                activeIndices={field.activeIndices}
                battleMode={field.battleMode}
                doublesType={field.doublesType}
                p1Hazards={field.p1Hazards}
                p2Hazards={field.p2Hazards}
                activeEffects={field.activeEffects}
                natureOptions={options.natureOptions}
                itemOptions={options.itemOptions}
                statusOptions={options.statusOptions}
                onTeamChange={handleTeamChange}
                onSaveTeam={saveCurrentTeam}
                onDeleteTeam={deleteP1Team}
                onDragStart={bench.handleDragStart}
                onDragOver={bench.handleDragOver}
                onDropOnBench={handleDropOnBench}
                onRemoveFromBench={removePokemonFromBench}
                toggleHazard={field.toggleHazard}
                updatePokemonForm={bench.updatePokemonForm}
                updatePokemonHp={bench.updatePokemonHp}
                updatePokemonStatus={bench.updatePokemonStatus}
                updatePokemonNature={bench.updatePokemonNature}
                updatePokemonItem={bench.updatePokemonItem}
                updatePokemonAbility={bench.updatePokemonAbility}
                updateAbilityToggle={bench.updateAbilityToggle}
                updatePokemonMove={bench.updatePokemonMove}
                updatePokemonGender={bench.updatePokemonGender}
                updatePokemonStat={bench.updatePokemonStat}
                updatePokemonLevel={bench.updatePokemonLevel}
                faintPokemon={bench.faintPokemon}
              />
            )}

            <div className="flex flex-col w-52 p-2 gap-1">
              <div className="h-30"></div>
              {[
                "Electric Terrain", "Grassy Terrain", "Misty Terrain", "Psychic Terrain",
                "Sun", "Rain", "Sand", "Snow", "Harsh Sunshine", "Heavy Rain",
                "Strong Winds", "Magic Room", "Wonder Room", "Gravity"
              ].map((effect) => {
                const isActive = field.activeEffects.includes(effect)
                return (
                  <button
                    key={effect}
                    type="button"
                    onClick={() => field.toggleEffect(effect)}
                    title={`Toggle ${effect}`}
                    className={`
                      w-full h-13 border border-white bg-gray-400 cursor-pointer transition-colors duration-200
                      ${isActive ? "bg-gray-700 text-white" : "text-white hover:bg-white hover:text-gray-400"}
                    `}
                  >
                    {effect}
                  </button>
                )
              })}
            </div>

            {isP2Loading ? (
              <TeamBenchSkeleton />
            ) : (
              <TeamBench
                player={2}
                teamNames={Object.keys(teams.p2Teams)}
                selectedTeamIndex={teams.p2SelectedTeamIndex}
                bench={bench.player2Bench}
                player1Bench={bench.player1Bench}
                player2Bench={bench.player2Bench}
                activeIndices={field.activeIndices}
                battleMode={field.battleMode}
                doublesType={field.doublesType}
                p1Hazards={field.p1Hazards}
                p2Hazards={field.p2Hazards}
                activeEffects={field.activeEffects}
                natureOptions={options.natureOptions}
                itemOptions={options.itemOptions}
                statusOptions={options.statusOptions}
                onTeamChange={handleTeamChange}
                onNavigate={navigateP2Teams}
                trainerInfo={teams.p2SelectedTeamIndex && teams.p2Teams[teams.p2SelectedTeamIndex]
                  ? teams.p2Teams[teams.p2SelectedTeamIndex].trainerInfo as TrainerInfo
                  : undefined}
                onDragStart={bench.handleDragStart}
                onDragOver={bench.handleDragOver}
                onDropOnBench={handleDropOnBench}
                onRemoveFromBench={removePokemonFromBench}
                toggleHazard={field.toggleHazard}
                updatePokemonForm={bench.updatePokemonForm}
                updatePokemonHp={bench.updatePokemonHp}
                updatePokemonStatus={bench.updatePokemonStatus}
                updatePokemonNature={bench.updatePokemonNature}
                updatePokemonItem={bench.updatePokemonItem}
                updatePokemonAbility={bench.updatePokemonAbility}
                updateAbilityToggle={bench.updateAbilityToggle}
                updatePokemonMove={bench.updatePokemonMove}
                updatePokemonGender={bench.updatePokemonGender}
                updatePokemonStat={bench.updatePokemonStat}
                updatePokemonLevel={bench.updatePokemonLevel}
                faintPokemon={bench.faintPokemon}
              />
            )}
          </div>

          {isP1Loading ? (
            <PokemonBoxSkeleton />
          ) : (
            <PokemonBox
              p1Boxes={boxManager.p1Boxes}
              p1BoxNames={boxManager.p1BoxNames}
              activeBoxIndex={boxManager.activeBoxIndex}
              isBoxLoading={boxManager.isBoxLoading}
              removeMode={ui.removeMode}
              onActiveBoxChange={boxManager.switchBox}
              isInBench={bench.isInBench}
              onDragStart={bench.handleDragStart}
              onTogglePokemonInBench={togglePokemonInBench}
              onRemoveFromBox={handleRemovePokemonFromBox}
              onAddBox={boxManager.addBox}
              onClearBox={boxManager.clearBox}
              onRemoveBox={boxManager.removeBox}
              onImportOpen={() => ui.setImportModalOpen(true)}
              onToggleRemoveMode={() => ui.setRemoveMode(prev => !prev)}
            />
          )}
        </div>
      </main>

      <ImportModal
        isOpen={ui.importModalOpen}
        onClose={() => ui.setImportModalOpen(false)}
        onImport={handleImportModal}
      />
    </div>
  )
}
