"use client"

import { useEffect } from "react"
import { Pokemon, Teams, Box, TrainerInfo } from "@/lib/utils/types.ts"
import { addPokemon, loadMyBoxes, resolveBoxes } from "@/lib/api/boxes"
import { MOVES_OPTIONS, ABILITY_OPTIONS, ITEMS_OPTIONS, NATURE_OPTIONS, TYPE_OPTIONS, STATUS_OPTIONS } from "@/lib/api/misc"
import { loadMyTeams, loadEnemyTeams, removeTeam, saveFullTeam } from "@/lib/api/teams"
import { useAuth0 } from "@auth0/auth0-react"
import { toast } from "sonner"
import apiClient from "@/lib/infrastructure/apiClient"

import ImportModal from "@/components/importModal"
import ToolSidebar from "@/components/toolSidebar"
import Header from "@/components/header"
import TurnEditor from "@/components/turnEditor"
import TeamBench from "@/components/teamBench"
import PokemonBox from "@/components/PokemonBox/pokemonBox"

import { useBattleOptions } from "@/lib/hooks/useBattleOptions"
import { useBoxManager } from "@/lib/hooks/useBoxManager"
import { useTeamManager } from "@/lib/hooks/useTeamManager"
import { useBattleField } from "@/lib/hooks/useBattleField"
import { useBench } from "@/lib/hooks/useBench"
import { useUIState } from "@/lib/hooks/useUIState"

export default function PokemonBattleSimulator() {
  const { isAuthenticated, isLoading } = useAuth0()

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

    async function loadInitialData() {
      try {
        const abilityList = await ABILITY_OPTIONS()
        const itemsList = await ITEMS_OPTIONS()
        const naturesList = await NATURE_OPTIONS()
        const movesList = await MOVES_OPTIONS()
        const typesList = await TYPE_OPTIONS()
        const statusList = await STATUS_OPTIONS()

        options.setAbilityOptions(abilityList)
        options.setItemOptions(itemsList)
        options.setNatureOptions(naturesList)
        options.setMovesOptions(movesList)
        options.setTypesOptions(typesList)
        options.setStatusOptions(statusList)

        const myBoxes = await loadMyBoxes(abilityList, itemsList, naturesList, movesList, typesList)
        boxManager.setP1Boxes(myBoxes)
        const savedNames = JSON.parse(localStorage.getItem("p1BoxNames") || "[]")
        const defaultNames = myBoxes.map((_: any, i: number) => savedNames[i] ?? `Box ${i + 1}`)
        boxManager.setP1BoxNames(defaultNames)
        localStorage.setItem("p1BoxNames", JSON.stringify(defaultNames))

        const resolvedP1Teams = await loadMyTeams(abilityList, itemsList, naturesList, movesList, typesList)
        teams.setP1Teams(resolvedP1Teams)

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
      } catch (err) {
        toast.error(`Failed to load data: ${err}`)
      }
    }

    const run = async () => {
      if (!isAuthenticated) {
        await apiClient.get("/api/guest/init")
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
        trainerInfo.partner !== "True" ? field.setDoublesType("Partner") : field.setDoublesType("True")
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
    if (!teams.p1SelectedTeamIndex) {
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
      trainerInfo.partner !== "True" ? field.setDoublesType("Partner") : field.setDoublesType("True")
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
          if (!updated[boxIndex]) return prev
          updated[boxIndex] = { ...updated[boxIndex], [boxKey]: resetPokemon }
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

  const togglePokemonInBench = async (pokemon: Pokemon, player: 1 | 2) => {
    const setBench = player === 1 ? bench.setPlayer1Bench : bench.setPlayer2Bench
    const currentBench = player === 1 ? bench.player1Bench : bench.player2Bench
    const isP1 = player === 1

    if (bench.isInBench(pokemon, player)) {
      const benchIndex = currentBench.findIndex(p => p?.ID === pokemon.ID)
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
          const newBox: Box = { ...updated[boxManager.activeBoxIndex] }
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
      const boxEntry = Object.entries(currentBox).find(([_, p]) => p?.ID === pokemon.ID)
      if (!boxEntry) return
      const [key] = boxEntry

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
        const newBox = { ...updated[boxIdx] };
        (newBox as any)[boxKey] = null
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

  const handleExport = () => {
    ui.setExportText(JSON.stringify({
      player1Bench: bench.player1Bench,
      player2Bench: bench.player2Bench,
      notes: ui.notes,
    }, null, 2))
  }

  const handleImportModal = async () => {
    if (!ui.importModalText.trim()) return
    try {
      const result = await addPokemon(String(boxManager.activeBoxIndex), ui.importModalText)
      if (result.allBoxes) {
        boxManager.setP1Boxes(resolveBoxes(
          result.allBoxes,
          options.abilityOptions, options.itemOptions, options.natureOptions,
          options.movesOptions, options.typesOptions
        ))
      }
      ui.setImportModalText("")
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
        sidebarView={ui.sidebarView}
        setSidebarView={ui.setSidebarView}
        activeBoxIndex={boxManager.activeBoxIndex}
        updateActiveBox={boxManager.updateActiveBox}
        importText={ui.importText}
        setImportText={ui.setImportText}
        exportText={ui.exportText}
        handleExport={handleExport}
        notes={ui.notes}
        setNotes={ui.setNotes}
      />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-4 space-y-6">
          <Header battleMode={field.battleMode} setBattleMode={field.setBattleMode} setSidebarOpen={ui.setSidebarOpen} />
          <TurnEditor healTeam={healTeam} player1Active={player1Active} player2Active={player2Active} />

          <div className="flex flex-row items-start justify-center w-full flex-nowrap">
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
          </div>

          <PokemonBox
            p1Boxes={boxManager.p1Boxes}
            p1BoxNames={boxManager.p1BoxNames}
            activeBoxIndex={boxManager.activeBoxIndex}
            removeMode={ui.removeMode}
            onActiveBoxChange={boxManager.setActiveBoxIndex}
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
