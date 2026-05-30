"use client"

import React, { useEffect, useState, Fragment } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { X, Plus, ChevronLeft, ChevronRight, Save, Trash2, Shield, Sword, Heart, Zap } from "lucide-react"

import { pokemonPayload,
  teamPayload,
  PokemonType, 
  PokemonTypes,
  Nature, 
  Natures, 
  Item, 
  Items, 
  Ability, 
  Abilities, 
  PokemonStats, 
  PokemonMove, 
  PokemonMoves,
  PokemonForm, 
  PokemonForms, 
  Gender, 
  PokemonStatus,
  PokemonStatuses,
  Pokemon, 
  Team,
  Teams, 
  Box, 
  TurnData, 
  createPokemon,
  TrainerInfo} from "@/lib/utils/types.ts";
import { fetchAddBox, fetchRemoveBox, fetchClearBox, addPokemon, loadMyBoxes, resolveBoxes } from "@/lib/api/boxes"; 
import { getStatusStyle, getTypeColor } from "@/lib/utils/formatters.ts";
import { fetchCalculateDamage, calcStats, fetchTypesData, MOVES_OPTIONS, ABILITY_OPTIONS, ITEMS_OPTIONS, NATURE_OPTIONS, TYPE_OPTIONS, STATUS_OPTIONS } from "@/lib/api/misc";
import {ITEM_SPRITE, TYPE_SPRITES, POKEMON_SPRITES, FEMALE_POKEMON_SPRITES, IS_MEGA_ITEM, TYPE_ICONS, MEGA_SYMBOL } from "@/lib/utils/sprites";
import { fetchAllTeams, loadEnemyTeams, addTeam, removeTeam, removeAllTeams } from "@/lib/api/teams";

import ImportModal from "@/components/importModal";
import ToolSidebar from "@/components/toolSidebar";
import Header from "@/components/header";
import TurnEditor from "@/components/turnEditor"

import PokemonEditor from "@/components/PokemonEditor/pokemonEditor";

export default function PokemonBattleSimulator() {

  // states
  const [p1Teams, setP1Teams] = useState<Teams>({});
  const [p2Teams, setP2Teams] = useState<Teams>({}); 
  const [p2OriginalTeams, setP2OriginalTeams] = useState<Teams>({});
  const [p1SelectedTeamIndex, setP1SelectedTeamIndex] = useState<string>(""); 
  const [p2SelectedTeamIndex, setP2SelectedTeamIndex] = useState<string>(""); 
  const [player1Bench, setPlayer1Bench] = useState<(Pokemon | null)[]>(Array(6).fill(null))
  const [player2Bench, setPlayer2Bench] = useState<(Pokemon | null)[]>(Array(6).fill(null))
  const [p1Boxes, setP1Boxes] = useState<Box[]>([]);
  const [p1BoxNames, setP1BoxNames] = useState<string[]>([]);
  const [activeBoxIndex, setActiveBoxIndex] = useState(0);
  const [originalPokemon, setOriginalPokemon] = useState<Box>({});

  const [abilityOptions, setAbilityOptions] = useState<Abilities>({}); 
  const [itemOptions, setItemOptions] = useState<Items>({}); 
  const [movesOptions, setMovesOptions] = useState<PokemonMoves>({}); 
  const [typesOptions, setTypesOptions] = useState<PokemonTypes>({}); 
  const [natureOptions, setNatureOptions] = useState<Natures>({}); 
  const [genderOptions, setGenderOptions] = useState<Gender>("Both");
  const [statusOptions, setStatusOptions] = useState<PokemonStatuses>({});

  
  const [draggedPokemon, setDraggedPokemon] = useState<{ pokemon: Pokemon; source: string } | null>(null)
  const [importText, setImportText] = useState("")
  const [exportText, setExportText] = useState("")
  const [notes, setNotes] = useState("")
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importModalText, setImportModalText] = useState("");
  const [removeMode, setRemoveMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarView, setSidebarView] = useState<"import" | "notes">("import")

  const [battleMode, setBattleMode] = useState<"singles" | "doubles">("singles"); 
  const [doublesType, setDoublesType] = useState<"True" | "Partner" | "None">("None")
  const activeIndices = battleMode === "singles" ? [0] : [0, 1]; 

  const [p1Hazards, setP1Hazards] = useState({ spikes: 0, tSpikes: 0, sRock: false, reflect: false, lightScreen: false, protect: false, stickyWebs: false, leechSeed: false, helpingHand: false, tailWind: false, flowerGift: false, friendGuard: false, auroraVeil: false, switchingOut: false })
  const [p2Hazards, setP2Hazards] = useState({ spikes: 0, tSpikes: 0, sRock: false, reflect: false, lightScreen: false, protect: false, stickyWebs: false, leechSeed: false, helpingHand: false, tailWind: false, flowerGift: false, friendGuard: false, auroraVeil: false, switchingOut: false })
  const [activeEffects, setActiveEffects] = useState<string[]>([]); 
  
  const toggleEffect = (effect: string) => {
      setActiveEffects((prev) => 
        prev.includes(effect) ? prev.filter((e) => e !== effect)
      : [...prev, effect]
      ) 
  }

  const handleDragStart = (pokemon: Pokemon, source: string) => {
    setDraggedPokemon({ pokemon, source })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const updateActiveBox = (newPokemonBox: Box) => {
    setP1Boxes((prev) => {
      const updated = [...prev]; 
      updated[activeBoxIndex] = newPokemonBox; 
      return updated;
    })
  };

  const handleDropOnBench = (player: 1 | 2, index: number) => {
    if (!draggedPokemon) return;

    const source = draggedPokemon.source;
    const isFromBox = source.startsWith("box-"); // format: "box-index-key"
    const setTargetBench = player === 1 ? setPlayer1Bench : setPlayer2Bench;

    if (isFromBox) {
      const parts = source.split("-");
      const boxKey = parts.slice(2).join("-");

      setTargetBench((prev) => {
        const newBench = [...prev];
        // Store boxKey and boxIndex so we can return it later
        newBench[index] = { ...draggedPokemon.pokemon, boxKey, boxIndex: parseInt(parts[1]) };
        return newBench;
      });

      // Remove from box source grid
      setP1Boxes((prev) => {
        const updated = [...prev];
        const boxIdx = parseInt(parts[1]);
        const newBox = { ...updated[boxIdx] };
        (newBox as any)[boxKey] = null;
        updated[boxIdx] = newBox;
        return updated;
      });
    } else {
      // Internal bench swap logic...
      const oldIndex = parseInt(source.split("-")[2]);
      setTargetBench((prev) => {
        const newBench = [...prev];
        const temp = newBench[index];
        newBench[index] = newBench[oldIndex];
        newBench[oldIndex] = temp;
        return newBench;
      });
    }
    setDraggedPokemon(null);
  };

  const handleTeamChange = (player: 1 | 2, teamName: string) => {
    if (player === 1) {
      setP1SelectedTeamIndex(teamName);
      const team = p1Teams[teamName];
      if (team) {
        player1Bench.map((pokemon, index) => {
          removePokemonFromBench(player, index)
        })
        setPlayer1Bench([0,1,2,3,4,5].map(i => team[i.toString()] as Pokemon || null));
      }
    } else {
      // Reset previous team's changes before switching
      if (p2SelectedTeamIndex && p2OriginalTeams[p2SelectedTeamIndex]) {
        setP2Teams(prev => ({
          ...prev,
          [p2SelectedTeamIndex]: JSON.parse(JSON.stringify(p2OriginalTeams[p2SelectedTeamIndex]))
        }));
      }

      setP2SelectedTeamIndex(teamName);
      

      const originalTeam = p2OriginalTeams[teamName];
      const trainerInfo = p2OriginalTeams[teamName].trainerInfo as TrainerInfo;

      if (trainerInfo && trainerInfo.format === "Doubles") {
        setBattleMode("doubles");
        trainerInfo.partner !== "True" ? setDoublesType("Partner") : setDoublesType("True")
      } else {
        setBattleMode("singles");
        setDoublesType("None");
      }

      if (originalTeam) {
        const slots = Object.entries(originalTeam)
          .filter(([k, v]) => k !== 'trainerInfo' && v !== null)
          .map(([_, v]) => v as Pokemon);
        const newBench: (Pokemon | null)[] = Array(6).fill(null);
        slots.forEach((p, i) => { newBench[i] = p; });
        setPlayer2Bench(newBench);
      }
    }
  }; 

  const saveCurrentTeam = () => {
    const name = window.prompt("Enter a name for this team"); 
    if (name) {
      const newTeam: Team = {}; 
      player1Bench.forEach((pokemon, index) => {
        newTeam[index.toString()] = pokemon;
      });

      newTeam["trainerInfo"] = { name: "PLayer 1", rules: "", format: "Singles", partner: "", myPartner: ""}

      setP1Teams(prev => ({ ...prev, [name]: newTeam }));
      setP1SelectedTeamIndex(name);
    }
  }; 

  const deleteP1Team = async () => {
    if (!p1SelectedTeamIndex) {
      setPlayer1Bench(Array(6).fill(null));
      return;
    }
    if (!window.confirm(`Delete team "${p1SelectedTeamIndex}"?`)) return;
    try {
      await removeTeam('1', p1SelectedTeamIndex);
      setP1Teams(prev => {
          const updated = { ...prev };
          delete updated[p1SelectedTeamIndex];
          return updated;
        });
        setP1SelectedTeamIndex("");
        setPlayer1Bench(Array(6).fill(null));
    } catch (err) {
        console.error(`Failed to delete team: ${err}`);
        window.alert(`Failed to delete team: ${err}`);
    }
  };

  const navigateP2Teams = (direction: 'next' | 'prev') => {
    const keys = Object.keys(p2Teams);
    if (keys.length === 0) return;

    let currentIndex = keys.indexOf(p2SelectedTeamIndex);
    currentIndex = direction === 'next'
      ? (currentIndex + 1) % keys.length
      : (currentIndex - 1 + keys.length) % keys.length;

    // Reset changes on current team before leaving
    if (p2SelectedTeamIndex && p2OriginalTeams[p2SelectedTeamIndex]) {
      setP2Teams(prev => ({
        ...prev,
        [p2SelectedTeamIndex]: JSON.parse(JSON.stringify(p2OriginalTeams[p2SelectedTeamIndex]))
      }));
    }

      const newKey = keys[currentIndex];
      setP2SelectedTeamIndex(newKey);

      const originalTeam = p2OriginalTeams[newKey];
      const trainerInfo = originalTeam.trainerInfo as TrainerInfo;
      if (trainerInfo && trainerInfo.format === "Doubles") {
        setBattleMode("doubles");
        trainerInfo.partner !== "True" ? setDoublesType("Partner") : setDoublesType("True")
      } else {
        setBattleMode("singles");
        setDoublesType("None");
      }

      if (originalTeam) {
        const slots = Object.entries(originalTeam)
          .filter(([k, v]) => k !== 'trainerInfo' && v !== null)
          .map(([_, v]) => v as Pokemon);
        const newBench: (Pokemon | null)[] = Array(6).fill(null);
        slots.forEach((p, i) => { newBench[i] = p; });
        setPlayer2Bench(newBench);
        setP2Teams(prev => ({
          ...prev,
          [newKey]: JSON.parse(JSON.stringify(originalTeam))
      }));
      } else {
        const team = p2Teams[newKey];
        const slots = Object.entries(team)
          .filter(([k, v]) => k !== 'trainerInfo' && v !== null)
          .map(([_, v]) => v as Pokemon);
        const newBench: (Pokemon | null)[] = Array(6).fill(null);
        slots.forEach((p, i) => { newBench[i] = p; });
        setPlayer2Bench(newBench);
      } 
  };

  const addBox = async () => {
    const name = window.prompt("Name this box:");
    if (!name) return;
    try {
      const myBoxesJSON = await fetchAddBox();
      const newBoxes: Box[] = myBoxesJSON.allBoxes;
      setP1Boxes(newBoxes);
      setP1BoxNames(prev => {
        const updated = [...prev, name];
        localStorage.setItem("p1BoxNames", JSON.stringify(updated));
        return updated;
      });
      setActiveBoxIndex(newBoxes.length - 1);
    } catch (err) {
      console.error(`Failed to add box: ${err}`);
    }
  };

  const removeBox = async () => {
    if (p1Boxes.length <= 1) { window.alert("You must keep at least one box."); return; }
    if (!window.confirm(`Delete "${p1BoxNames[activeBoxIndex]}"? This cannot be undone.`)) return;
    try {
      const myBoxesJSON = await fetchRemoveBox(String(activeBoxIndex)); 
      const resolvedBoxes = await resolveBoxes(myBoxesJSON.allBoxes, abilityOptions, itemOptions, natureOptions, movesOptions, typesOptions);
      setP1Boxes(resolvedBoxes);
      setP1BoxNames(prev => {
        const updated = prev.filter((_, i) => i !== activeBoxIndex);
        localStorage.setItem("p1BoxNames", JSON.stringify(updated));
        return updated;
      });
      setActiveBoxIndex(Math.max(0, activeBoxIndex - 1));
    } catch (err) {
      console.error(`Failed to remove box: ${err}`);
    }
  };

  const clearBox = async () => {
    if (!window.confirm(`Clear all Pokemon from Box ${activeBoxIndex + 1}? This cannot be undone.`)) return;
    try {
      const myBoxesJSON = await fetchClearBox(String(activeBoxIndex));
      const resolvedBoxes = await resolveBoxes(myBoxesJSON.allBoxes, abilityOptions, itemOptions, natureOptions, movesOptions, typesOptions);
      setP1Boxes(resolvedBoxes);
    } catch (err) {
      updateActiveBox({});
    }
  };

  const toggleHazard = (player: 1 | 2, key: string) => {
    const setHazards = player === 1 ? setP1Hazards : setP2Hazards;
  
    setHazards((prev: any) => {
    if (key === "spikes") {
      return { ...prev, spikes: (prev.spikes + 1) % 4 };
    }
    if (key === "tSpikes") {
      return { ...prev, tSpikes: (prev.tSpikes + 1) % 3 };
    }
    // Handle booleans
    return { ...prev, [key]: !prev[key] };
    });
  };

  const handleImportModal = async () => {
    if (!importModalText.trim()) return;
    try {
      const result = await addPokemon(String(activeBoxIndex), importModalText);
      if (result.updatedBox) {
        const resolvedBoxes = await resolveBoxes(result.updatedBox, abilityOptions, itemOptions, natureOptions, movesOptions, typesOptions);
        setP1Boxes(resolvedBoxes);
      }
      setImportModalText("");
      setImportModalOpen(false);
    } catch (err) {
      console.error(`Import failed: ${err}`);
      window.alert(`Import failed: ${err}`);
    }
  };

  const handleExport = () => {
    const exportData = {
      player1Bench,
      player2Bench,
      notes,
    }
    setExportText(JSON.stringify(exportData, null, 2))
  }

  

  const healTeam = () => {
    const heal = (p: Pokemon | null): Pokemon | null => 
      p ? { ...p, currentHp: p.maxHp, status: statusOptions["Healthy"] } : p;

    setPlayer1Bench((prev) => prev.map(heal));
    setPlayer2Bench((prev) => prev.map(heal));
    // Since the box is Pokemon[], we ensure the type remains strict
    
    const currentBox = p1Boxes[activeBoxIndex];
    if (currentBox) {
      const healBox: Box = {}; 
      Object.entries(currentBox).forEach(([key, pokemon]) => {
        healBox[key] = heal(pokemon) as Pokemon;
      });
      updateActiveBox(healBox);    
    }

  }

  const faintPokemon = (player: 1 | 2, slotIndex: number) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench; 
    setBench((prev) => 
      prev.map((p, i) => {
        if (i === slotIndex && p) {
          const isFainted = p.status.name === "Fainted"; 
          return {
            ...p, 
            currentHp: isFainted ? p.maxHp : 0, 
            status: isFainted ? statusOptions["Healthy"] : statusOptions["Fainted"],
          }
        }
        return p;
      }
    ))
    
  }

  

  const togglePokemonInBench = async (pokemon: Pokemon, player: 1 | 2) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench;
    const currentBench = player === 1 ? player1Bench : player2Bench;
    const isP1 = player === 1;

    if (isInBench(pokemon, player)) {
      const benchIndex = currentBench.findIndex(p => p?.ID === pokemon.ID);
      if (benchIndex === -1) return;

      if (pokemon.boxKey !== undefined && pokemon.boxIndex !== undefined && isP1) {
        const resetPokemon: Pokemon = {
          ...pokemon,
          currentHp: pokemon.maxHp,
          status: statusOptions["Healthy"],
          statBoosts: { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 },
        };
        setP1Boxes(prev => {
          const updated = [...prev];
          const newBox: Box = { ...updated[activeBoxIndex] };
          newBox[pokemon.boxKey!] = resetPokemon;
          updated[activeBoxIndex] = newBox;
          return updated;
        });
      }

      const newBench = [...currentBench];
      newBench[benchIndex] = null;
      setBench(newBench);

    } else {
      const emptySlot = currentBench.indexOf(null);
      if (emptySlot === -1) return;

      const currentBox = p1Boxes[activeBoxIndex];
      const boxEntry = Object.entries(currentBox).find(([_, p]) => p?.ID === pokemon.ID);
      if (!boxEntry) return;
      const [key] = boxEntry;

      setBench(prev => {
        const newBench = [...prev];
        newBench[emptySlot] = { ...pokemon, boxKey: key, boxIndex: activeBoxIndex };
        return newBench;
      });

      setOriginalPokemon(prev => ({ ...prev, [key]: { ...pokemon, boxKey: key, boxIndex: activeBoxIndex } }));


      if (isP1) {
        setP1Boxes(prev => {
          const updated = [...prev];
          updated[activeBoxIndex] = { ...updated[activeBoxIndex], [key]: null };
          return updated;
        });
      }
    }
  };

  const isInBench = (pokemon: Pokemon, player: 1 | 2) => {
    const bench = player === 1 ? player1Bench : player2Bench
    return bench.some((p) => p?.ID === pokemon.ID)
  }

  const removeFromSource = (source: string) => {
    if (source.startsWith("box-")) {
      const parts = source.split("-");
      const boxIndex = parseInt(parts[1]);
      const pokemonID = parts.slice(2).join("-");

      setP1Boxes((prev) => {
        const updated = [...prev]; 
        const newBox = { ...updated[boxIndex] }; 
        delete newBox[pokemonID]; 
        updated[boxIndex] = newBox; 
        return updated;
      }); 

    }
  };

  const removePokemonFromBench = async (player: 1 | 2, index: number) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench;
    const currentBench = player === 1 ? player1Bench : player2Bench;
    const pokemon = currentBench[index];
    if (!pokemon) return;

    if (player === 1) {
      const { boxIndex, boxKey } = pokemon;
      if (boxKey !== undefined && boxIndex !== undefined) {
        const original = originalPokemon[boxKey];
        const resetPokemon: Pokemon = original
          ? { ...original, currentHp: original.maxHp, status: statusOptions["Healthy"] }
          : { ...pokemon, currentHp: pokemon.maxHp, status: statusOptions["Healthy"], statBoosts: { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 } };
        setP1Boxes(prev => {
          const updated = [...prev];
          if (!updated[boxIndex]) return prev;
          updated[boxIndex] = { ...updated[boxIndex], [boxKey]: resetPokemon };
          return updated;
        });
        setOriginalPokemon(prev => {
          const updated = { ...prev };
          delete updated[boxKey];
          return updated;
        });
      }
    } else {
      // Reset this pokemon in p2Teams back to its original snapshot
      const originalTeam = p2OriginalTeams[p2SelectedTeamIndex];
      if (originalTeam) {
        const originalEntry = Object.entries(originalTeam).find(
          ([_, p]) => (p as Pokemon)?.ID === pokemon.ID
        );
        if (originalEntry) {
          const [slotKey, originalPokemon] = originalEntry;
          setP2Teams(prev => ({
            ...prev,
            [p2SelectedTeamIndex]: {
              ...prev[p2SelectedTeamIndex],
              [slotKey]: JSON.parse(JSON.stringify(originalPokemon))
            }
          }));
        }
      }
    }

    const newBench = [...currentBench];
    newBench[index] = null;
    setBench(newBench);
  };

  // on initial load
  useEffect(() => {
    async function loadInitialData() {
      try {

        const abilityList = await ABILITY_OPTIONS();
        const itemsList = await ITEMS_OPTIONS(); 
        const naturesList = await NATURE_OPTIONS();
        const movesList = await MOVES_OPTIONS();
        const typesList = await TYPE_OPTIONS(); 
        const statusList = await STATUS_OPTIONS();

        setAbilityOptions(abilityList); 
        setItemOptions(itemsList); 
        setNatureOptions(naturesList); 
        setMovesOptions(movesList); 
        setTypesOptions(typesList);
        setStatusOptions(statusList);
        
        // my boxes 
        const myBoxes = await loadMyBoxes(abilityList, itemsList, naturesList, movesList, typesList);
        setP1Boxes(myBoxes);
        const savedNames = JSON.parse(localStorage.getItem("p1BoxNames") || "[]");
        const defaultNames = myBoxes.map((_: any, i: number) => savedNames[i] ?? `Box ${i + 1}`);
        setP1BoxNames(defaultNames);
        localStorage.setItem("p1BoxNames", JSON.stringify(defaultNames));

        // my teams
        const myTeamsJSON = await fetchAllTeams('1');
        setP1Teams(myTeamsJSON.allTeams);

        // enemy teams
        const resolvedP2Teams: Teams = await loadEnemyTeams(abilityList, itemsList, naturesList, movesList, typesList);
        setP2Teams(resolvedP2Teams);
        setP2OriginalTeams(JSON.parse(JSON.stringify(resolvedP2Teams)));
        console.log(resolvedP2Teams);
        
        // load blue's team into P2
        const firstTeamKey = Object.keys(resolvedP2Teams)[0];
        if (firstTeamKey) {
          setP2SelectedTeamIndex(firstTeamKey);
          const firstTeam = resolvedP2Teams[firstTeamKey];
          const slots = Object.entries(firstTeam)
            .filter(([k, v]) => k !== 'trainerInfo' && v !== null)
            .map(([_, v]) => v as Pokemon);
          const initialBench: (Pokemon | null)[] = Array(6).fill(null);
          slots.forEach((p, i) => { initialBench[i] = p; });
          setPlayer2Bench(initialBench);
        }


      } catch (err) {
        console.error(`failed to load data: ${err}`);
      }
      
    }

    loadInitialData();
  }, [])

  const updatePokemonForm = (player: 1 | 2, slotIndex: number, newFormName: string) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench;
    setBench((prev) => prev.map((p, i) => {
      if (i !== slotIndex || !p) return p;
      const newForm = p.forms[newFormName];
      if (!newForm) return p;
      const updated = {
        ...p,
        form: newForm,
        sprite: POKEMON_SPRITES(String(newForm.ID)),
        type1: newForm.type1,
        type2: newForm.type2,
        types: newForm.type2.name !== "None" ? [newForm.type1, newForm.type2] : [newForm.type1],
        ability: newForm.ability,
        abilities: newForm.abilities,
        baseStats: newForm.baseStats,
        finalStats: newForm.finalStats,
        allMoves: newForm.allMoves,
      }
      calcStats(updated).then((newStats) => {
        setBench((prev2) => prev2.map((p2, i2) =>
          i2 === slotIndex && p2
            ? { 
                ...p2, 
                finalStats: newStats, 
                maxHp: newStats.HP, 
                currentHp: Math.min(p2.currentHp, newStats.HP) , 
              }
            : p2
        ))
      }).catch(console.error)
      return updated;
    }))
  }
  
  const updatePokemonHp = (player: 1 | 2, slotIndex: number, newHp: number) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench; 
    setBench((prev) => prev.map((p, i) => {
      if (i !== slotIndex || !p) return p;
      return { ...p, currentHp: Math.min(newHp, p.maxHp) }
    }));
  }

  // update this so that the Pokemon stats are recalc  when status is changed
  const updatePokemonStatus = (player: 1 | 2, slotIndex: number, statusName: string) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench; 
    setBench((prev) => prev.map((p, i) => {
      if (i !== slotIndex || !p) return p;
      const updated = { ...p, status: statusOptions[statusName] }
      calcStats(updated).then((newStats) => {
        setBench((prev2) => prev2.map((p2, i2) => 
          i2 === slotIndex && p2 ? 
            { ...p2, finalStats: newStats, maxHp: newStats.HP, currentHp: Math.min(p2.currentHp, newStats.HP) }
            : p2
        ))
      }).catch(console.error)
      return updated;
    }));
  }

  const updatePokemonNature = (player: 1 | 2, slotIndex: number, natureName: string) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench;
    setBench((prev) => prev.map((p, i) => {
      if (i !== slotIndex || !p) return p;
      const updated = { ...p, nature: natureOptions[natureName] }
      calcStats(updated).then((newStats) => {
        setBench((prev2) => prev2.map((p2, i2) =>
          i2 === slotIndex && p2
            ? { ...p2, finalStats: newStats, maxHp: newStats.HP, currentHp: Math.min(p2.currentHp, newStats.HP) }
            : p2
        ))
      }).catch(console.error)
      return updated
    }))
  }

  const updatePokemonItem = (player: 1 | 2, slotIndex: number, itemName: string) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench;
    setBench((prev) => prev.map((p, i) => {
      if (i !== slotIndex || !p ) return p;
      return { ...p, item: itemOptions[itemName] }
    })); 

  }

  const updatePokemonAbility = (player: 1 | 2, slotIndex: number, abilityName: string) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench;
    setBench((prev) => prev.map((p, i) => {
      if (i !== slotIndex || !p) return p;
      const ability = p.abilities.find(a => a.name === abilityName);
      if (!ability) return p;
      return { ...p, ability };
    }))
  }

  const updateAbilityToggle = (player: 1 | 2, slotIndex: number, toggledOn: boolean) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench;
    setBench((prev) => prev.map((p, i) => {
      if (i !== slotIndex || !p) return p;
      return { ...p, ability: { ...p.ability, toggledOn } };
    }));
  };

  const updatePokemonMove = (
    player: 1 | 2,
    slotIndex: number,
    moveIndex: number,
    newMoveName?: string,
    newType?: string,
    newCategory?: string
  ) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench;
    setBench((prev) =>
      prev.map((p, i) => {
        if (i !== slotIndex || !p) return p;

        const updatedMoveset = p.moveset.map((m, idx) => {
          if (idx !== moveIndex) return m;

          // Swapping the whole move by name
          if (newMoveName && newMoveName !== m.name) {
            const newMove = p.allMoves.find((mv) => mv.name === newMoveName);
            return newMove ?? m;
          }

          // Overriding just the type
          if (newType) {
            return { ...m, type: newType };
          }

          // Overriding just the category
          if (newCategory) {
            return { ...m, category: newCategory };
          }

          return m;
        });

        return { ...p, moveset: updatedMoveset };
      })
    );
  };

  const updatePokemonGender = (player: 1 | 2, slotIndex: number, gender: Gender) => {
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench;
  
  setBench((prev) => prev.map((p, i) => {

    if (i === slotIndex && p) return { ...p, gender};
    
    return p;
  }));
  }

  const updatePokemonStat = async (
    player: 1 | 2,
    slotIndex: number,
    statCategory: "baseStats" | "IVs" | "EVs" | "statBoosts",
    statName: keyof PokemonStats,
    value: string,
  ) => {
    const numValue = parseInt(value) || 0;
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench;

    // 1. Get the current pokemon and create the updated version first
    let updatedPokemon: Pokemon | null = null;
    
    setBench((prev) => {
      const newBench = [...prev];
      const p = newBench[slotIndex];
      if (p) {
        updatedPokemon = {
          ...p,
          [statCategory]: { ...p[statCategory], [statName]: numValue },
        };
        newBench[slotIndex] = updatedPokemon;
      }
      return newBench;
    });

    // 2. Call the backend outside of the state updater
    if (updatedPokemon) {
      try {
        const newStats = await calcStats(updatedPokemon);
        setBench((prev) =>
          prev.map((p, i) =>
            i === slotIndex && p
              ? { ...p, finalStats: newStats, maxHp: newStats.HP, currentHp: Math.min(p.currentHp, newStats.HP) }
              : p
          )
        );
      } catch (error) {
        console.error(error);
      }
    }
  };

  const updatePokemonLevel = (player: 1 | 2, slotIndex: number, level: string) => {
    const newLevel = Math.max(1, Math.min(100, parseInt(level) || 1));
    const setBench = player === 1 ? setPlayer1Bench : setPlayer2Bench;
    
    setBench((prev) => prev.map((p, i) => {
      if (i !== slotIndex || !p) return p;
      const updated = { ...p, level: newLevel };
      
      // Recalculate stats based on the new level
      calcStats(updated).then((newStats) => {
        setBench((prev2) => prev2.map((p2, i2) =>
          i2 === slotIndex && p2
            ? { 
                ...p2, 
                finalStats: newStats, 
                maxHp: newStats.HP, 
                currentHp: newStats.HP 
              }
            : p2
        ))
      }).catch(console.error);
      
      return updated;
    }));
  };

  const player1Active = battleMode !== "singles" ? player1Bench[0] : [player1Bench[0], player1Bench[1]];
  const player2Active = battleMode !== "singles" ? player2Bench[0] : [player2Bench[0], player2Bench[1]];

  const currentBoxPokemon = p1Boxes[activeBoxIndex] ?
   (Object.values(p1Boxes[activeBoxIndex]).filter(p => p && 'id' in p) as Pokemon[])
    : [];

  return (
    <div className="flex h-screen">
      <ToolSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarView={sidebarView}
        setSidebarView={setSidebarView}  
        activeBoxIndex={activeBoxIndex}
        updateActiveBox={updateActiveBox}
        importText={importText}
        setImportText={setImportText}
        exportText={exportText}
        handleExport={handleExport}
        notes={notes}
        setNotes={setNotes}
      />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-4 space-y-6">
          <Header battleMode={battleMode} setBattleMode={setBattleMode} setSidebarOpen={setSidebarOpen}/>
          <TurnEditor healTeam={healTeam} player1Active={player1Active} player2Active={player2Active}/>          

          <div className="flex flex-row items-start justify-center w-full flex-nowrap">
            <Card>
              <CardHeader>
                <CardTitle className="text-secondary">Player 1 Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Player 1 Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor="p1-team-select" className="sr-only">Player 1 Team</label>
                    <select
                      id="p1-team-select"
                      title="Select Player 1 Team"
                      className="bg-white-800 p-2 rounded border border-secondary text-xl font-bold flex-grow"
                      value={p1SelectedTeamIndex}
                      onChange={(e) => handleTeamChange(1, e.target.value)}
                      aria-label="Select Team 1"
                    >
                      <option value="">Select a Team</option>
                      {Object.keys(p1Teams).map((teamName, i) => (
                        <option key={teamName} value={teamName}>{teamName}</option>
                      ))}
                    </select>
                    <button onClick={saveCurrentTeam} className="p-2 bg-blue-600 rounded hover:bg-blue-500" title="Save Team" aria-label="Save Team">
                      <Save size={20} />
                    </button>
                    <button onClick={deleteP1Team} className="p-2 bg-red-600 rounded hover:bg-red-500" title="Clear Team" aria-label="Clear Team">
                      <Trash2 size={20} />
                    </button>
                  </div>
                  {/* Render Player 1 Bench here using player1Bench state */}
                </div>
                <div className="flex  flex-col border-3 border-secondary/30 rounded-lg p-2 min-h-[200px] bg-secondary/5 w-[630px]">
                  <p className="text-xs text-muted-foreground mb-2">Active Pokemon (First Bench Slot)</p>
                  {activeIndices.map((idx) => 
                    <PokemonEditor
                      key={`p1-${idx}`}
                      pokemon={player1Bench[idx]}
                      player={1}
                      slotIndex={idx}
                      battleMode={battleMode}
                      doublesType={doublesType}
                      toggleHazard={toggleHazard}
                      p1Hazards={p1Hazards}
                      p2Hazards={p2Hazards}
                      activeEffects={activeEffects}
                      natureOptions={natureOptions}
                      itemOptions={itemOptions}
                      statusOptions={statusOptions}
                      updatePokemonForm={updatePokemonForm}
                      updatePokemonHp={updatePokemonHp}
                      updatePokemonStatus={updatePokemonStatus}
                      updatePokemonNature={updatePokemonNature}
                      updatePokemonItem={updatePokemonItem}
                      updatePokemonAbility={updatePokemonAbility}
                      updateAbilityToggle={updateAbilityToggle}
                      updatePokemonMove={updatePokemonMove}
                      updatePokemonGender={updatePokemonGender}
                      updatePokemonStat={updatePokemonStat}
                      updatePokemonLevel={updatePokemonLevel}
                      player1Bench={player1Bench}
                      player2Bench={player2Bench}
                      faintPokemon={faintPokemon}
                    />
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2">Bench (6 Pokemon)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Player 1 Bench Rendering */}
                      {player1Bench.map((pokemon, index) => (
                        <div
                          key={index}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDropOnBench(1, index)}
                          // 1. Added 'relative' so the icon positions correctly to this box
                          className="relative border-2 border-dashed border-secondary/20 rounded-lg p-2 min-h-[100px] bg-secondary/5"
                        >
                          {/* 2. Mega Symbol logic - now at the top right of the box and larger (w-10 h-10) */}
                          {pokemon && IS_MEGA_ITEM(pokemon.item.name) && (
                            <img
                              src={MEGA_SYMBOL}
                              alt="Mega Capable"
                              className="absolute top-1 right-1 w-9 h-10 z-10 drop-shadow-md"
                            />
                          )}
                          {pokemon ? (
                            <div draggable onDragStart={() => handleDragStart(pokemon, `p1-bench-${index}`)}>
                              <div className="text-center">
                                <img
                                  src={(pokemon.gender === "F" && pokemon.femaleSprite) ? 
                                        FEMALE_POKEMON_SPRITES(pokemon.ID) : pokemon.sprite}
                                  alt={pokemon.name}
                                  className="w-20 h-20 mx-auto"
                                />
                                {pokemon && pokemon.status.name !== "Healthy" && (
                                  <div className="inset-0 flex items-center justify-center pointer-events-none z-20 rounded-lg">
                                    <div className={`w-full mb-2 py-1 text-center font-black text-[10px] uppercase shadow-md border-y border-black/10 opacity-95 ${getStatusStyle(pokemon.status.name)}`}>
                                      {pokemon.status.name}
                                    </div>
                                  </div>
                                )}
                                <p className="text-xs font-semibold truncate">{pokemon.name}</p>
                                <p className="text-xs text-muted-foreground">Lv.{pokemon.level}</p>
                                <Badge variant="outline" className="text-xs mt-1 mr-3">
                                  {pokemon.ability.name}
                                </Badge>
                                {pokemon.ability.toggle && (
                                  <label className="cursor-pointer ml-1" title="Toggle ability effect">
                                    <input
                                      type="checkbox"
                                      title="Toggle ability effect"
                                      checked={pokemon.ability.toggledOn ?? false}
                                      onChange={(e) => updateAbilityToggle(1, index, e.target.checked)}
                                      className="cursor-pointer"
                                    />
                                  </label>
                                )}
                                <span className="flex flex-row gap-2 justify-center">
                                  <Badge variant="outline" className="text-xs mt-1 mr-3">
                                    <img className="h-6 w-6" src={ITEM_SPRITE(pokemon.item.name)} alt={`${pokemon.item.name} icon`}></img>
                                    {pokemon.item.name}
                                  </Badge>
                                </span>
                                
                                {pokemon.status.name !== "Healthy" && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block ${getStatusStyle(pokemon.status.name)}`}>
                                    {pokemon.status.name}
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title={`Remove ${pokemon.name} from bench`}
                                  className="h-6 w-6 mt-1 text-destructive"
                                  onClick={() => removePokemonFromBench(1, index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                              Empty
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col w-52 p-2 gap-1">
              <div className="h-30"></div>
              {[
                "Electric Terrain", "Grassy Terrain", "Misty Terrain", "Psychic Terrain",
                "Sun", "Rain", "Sand", "Snow", "Harsh Sunshine", "Heavy Rain",
                "Strong Winds", "Magic Room", "Wonder Room", "Gravity"
              ].map((effect) => {
                const isActive = activeEffects.includes(effect);
                return (
                  <button
                    key={effect}
                    onClick={() => toggleEffect(effect)}
                    title={`Toggle ${effect}`}
                    className={`
                      w-full h-13 border border-white bg-gray-400 cursor-pointer transition-colors duration-200
                      ${isActive
                        ? "bg-gray-700 text-white"
                        : "text-white hover:bg-white hover:text-gray-400"
                      }
                    `}
                  >
                    {effect}
                  </button>
                );
              })}
            </div>

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-primary">Player 2 Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Player 2 Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigateP2Teams('prev')} title="Previous Team" className="p-2 rounded hover:bg-primary/20 transition-colors cursor-pointer" aria-label="Previous Team"><ChevronLeft /></button>
                    <label htmlFor="p2-team-select" className="sr-only">Player 2 Team</label>
                    <select
                      id="p2-team-select"
                      title="Select Player 2 Team"
                      className="p-2 rounded border border-primary text-xl font-bold flex-grow"
                      value={p2SelectedTeamIndex}
                      onChange={(e) => handleTeamChange(2, e.target.value)}
                      aria-label="Select Team 2"
                    >
                      {Object.keys(p2Teams).map((teamName) => (
                        <option key={teamName} value={teamName}>{teamName}</option>
                      ))}
                    </select>
                    <button onClick={() => navigateP2Teams('next')} title="Next Team" className="p-2 rounded hover:bg-primary/20 transition-colors cursor-pointer" aria-label="Next Team"><ChevronRight /></button>
                  </div>
                  {/* Render Player 2 Bench here using player2Bench state */}
                </div>

                  {p2SelectedTeamIndex && p2Teams[p2SelectedTeamIndex].trainerInfo && (p2Teams[p2SelectedTeamIndex].trainerInfo as TrainerInfo).rules !== "" ? 
                      <div className="flex flex-row font-bold text-2xl text-primary gap-1 ml-3">
                        <p className="text-black">Condition: </p>
                        <p className="font-weight-black"> 
                          {(p2Teams[p2SelectedTeamIndex].trainerInfo as TrainerInfo).rules}
                        </p>
                      </div>

                    : ""

                  }
                

                <div className="flex flex-col border-2 border-primary/30 rounded-lg p-2 min-h-[200px] bg-primary/5 w-[630px]">
                  <p className="text-xs text-muted-foreground mb-2">Active Pokemon (First Bench Slot)</p>
                  {activeIndices.map((idx) => 
                    <PokemonEditor
                      key={`p2-${idx}`}
                      pokemon={player2Bench[idx]}
                      player={2}
                      slotIndex={idx}
                      battleMode={battleMode}
                      doublesType={doublesType}
                      toggleHazard={toggleHazard}
                      p1Hazards={p1Hazards}
                      p2Hazards={p2Hazards}
                      activeEffects={activeEffects}
                      natureOptions={natureOptions}
                      itemOptions={itemOptions}
                      statusOptions={statusOptions}
                      updatePokemonForm={updatePokemonForm}
                      updatePokemonHp={updatePokemonHp}
                      updatePokemonStatus={updatePokemonStatus}
                      updatePokemonNature={updatePokemonNature}
                      updatePokemonItem={updatePokemonItem}
                      updatePokemonAbility={updatePokemonAbility}
                      updateAbilityToggle={updateAbilityToggle}
                      updatePokemonMove={updatePokemonMove}
                      updatePokemonGender={updatePokemonGender}
                      updatePokemonStat={updatePokemonStat}
                      updatePokemonLevel={updatePokemonLevel}
                      player1Bench={player1Bench}
                      player2Bench={player2Bench}
                      faintPokemon={faintPokemon}
                    />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Bench (6 Pokemon)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Player 2 Bench Rendering */}
                      {player2Bench.map((pokemon, index) => (
                        <div
                          key={index}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDropOnBench(2, index)}
                          // 1. Added 'relative' class
                          className={`relative border-2 border-dashed border-primary/20 rounded-lg p-2 min-h-[100px] ${doublesType === "Partner" && index > 2 ? "bg-primary/30 " : "bg-primary/5"}`}
                        >

                          {/* 2. Mega Symbol logic - larger and at the top right of the box */}
                          {pokemon && IS_MEGA_ITEM(pokemon.item.name) && (
                            <img
                              src={MEGA_SYMBOL}
                              alt="Mega Capable"
                              className="absolute top-1 right-1 w-9 h-10 z-10 drop-shadow-md"
                            />
                          )}
                          {/* Status Banner Overlay */}
                          {pokemon ? (
                            <div draggable onDragStart={() => handleDragStart(pokemon, `p2-bench-${index}`)}>
                              <div className="text-center">
                              <Badge variant="outline" className="text-xs">
                                {pokemon.switchInScore}
                              </Badge>
                                <img
                                  src={(pokemon.gender === "F" && pokemon.femaleSprite) ? 
                                        FEMALE_POKEMON_SPRITES(pokemon.ID) : pokemon.sprite}
                                  alt={pokemon.name}
                                  className="w-20 h-20 mx-auto"
                                />
                                {pokemon && pokemon.status.name !== "Healthy" && (
                                  <div className="inset-0 flex items-center justify-center pointer-events-none z-20 rounded-lg">
                                    <div className={`w-full mb-2 py-1 text-center font-black text-[10px] uppercase shadow-md border-y border-black/10 opacity-95 ${getStatusStyle(pokemon.status.name)}`}>
                                      {pokemon.status.name}
                                    </div>
                                  </div>
                                )}
                                <p className="text-xs font-semibold truncate">{pokemon.name}</p>
                                <p className="text-xs text-muted-foreground">Lv.{pokemon.level}</p>
                                <Badge variant="outline" className="text-xs mt-1 mr-3">
                                  {pokemon.ability ? pokemon.ability.name : "None"}
                                </Badge>
                                {pokemon.ability.toggle && (
                                  <label className="cursor-pointer ml-1" title="Toggle ability effect">
                                    <input
                                      type="checkbox"
                                      title="Toggle ability effect"
                                      checked={pokemon.ability.toggledOn ?? false}
                                      onChange={(e) => updateAbilityToggle(2, index, e.target.checked)}
                                      className="cursor-pointer"
                                    />
                                  </label>
                                )}
                                <span className="flex flex-row gap-2 justify-center">
                                  <Badge variant="outline" className="text-xs mt-1 mr-3">
                                    <img className="w-6 h-6" src={ITEM_SPRITE(pokemon.item.name)} alt={`${pokemon.item.name} icon`}></img>
                                    {pokemon.item.name}
                                  </Badge>
                                </span>
                                {pokemon.status.name !== "Healthy" && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block ${getStatusStyle(pokemon.status.name)}`}>
                                    {pokemon.status.name}
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title={`Remove ${pokemon.name} from bench`}
                                  className="h-6 w-6 mt-1 text-destructive"
                                  onClick={() => removePokemonFromBench(2, index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                              Empty
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-row justify-between">
                <CardTitle>Pokemon Box</CardTitle>
                <div className="flex gap-2 items-center">

                  <button onClick={addBox} title="Add a new Pokemon box" className="w-30 h-10 p-2 bg-[#4E9152] rounded hover:bg-green-600" aria-label="Add Box">
                    <div className="flex items-center gap-2 flex-row">
                      <p>Add Box</p>
                      <Plus size={20} />
                    </div>
                  </button>

                  <button onClick={clearBox} title="Clear all Pokemon from current box" aria-label="Clear Box" className="w-30 h-10 p-2 bg-[#FADA5E] rounded hover:bg-[#BA8E23]">
                    <div className="flex items-center gap-2 flex-row">
                      <p>Clear Box</p>
                      <Trash2 size={20} />
                    </div>
                  </button>

                  <button onClick={removeBox} title="Delete the current box permanently" aria-label="Delete Box" className="w-35 h-10 p-2 bg-[#FF746C] rounded hover:bg-red-500">
                    <div className="flex items-center gap-2 flex-row">
                      <p>Delete Box</p>
                      <X/>
                    </div>
                  </button>

                  <button
                    onClick={() => setImportModalOpen(true)}
                    title="Import Pokemon from import text"
                    aria-label="Import Pokemon"
                    className="w-35 h-15 p-2 bg-[#6A9BD8] text-white rounded hover:bg-blue-500"
                  >
                    <div className="flex h-10 items-center gap-2 flex-row">
                      <p>Import Pokemon</p>
                      <Plus size={20} />
                    </div>
                  </button>

                  <button
                    onClick={() => setRemoveMode(prev => !prev)}
                    title={removeMode ? "Cancel remove mode" : "Enter remove mode to delete Pokemon from box"}
                    aria-label={removeMode ? "Cancel Remove" : "Remove Pokemon"}
                    className={`w-35 text-white p-2 rounded ${removeMode ? "bg-red-600 hover:bg-red-700" : "bg-[#A0522D] hover:bg-[#7B3F00]"}`}
                  >
                    <div className="flex items-center gap-2 flex-row">
                      <p>{removeMode ? "Cancel Remove" : "Remove Pokemon"}</p>
                      <Trash2 size={20} />
                    </div>
                  </button>

                </div>
              </div>
            </CardHeader>
            <CardContent>
              
              <Tabs value={`box-${activeBoxIndex}`} onValueChange={(val) => setActiveBoxIndex(parseInt(val.split("-")[1]))}>
                <TabsList className="flex w-full">
                  {p1Boxes.map((_, index) => (
                    <TabsTrigger
                      key={index}
                      value={`box-${index}`}
                      className="flex-1 min-w-0 cursor-pointer hover:bg-white hover:text-black"
                    >
                      {p1BoxNames[index] ?? `Box ${index + 1}`}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {p1Boxes.map((box, boxIndex) => (
                  <TabsContent key={boxIndex} value={`box-${boxIndex}`}>
                    <div className="grid grid-cols-6 gap-2 p-2">
                      {/* Use Object.entries so we have the ID/Key for the empty slots */}
                      {Object.entries(box).map(([slotKey, pokemon]) => {
                        // If there is no pokemon in this slot, render an empty placeholder
                        if (!pokemon) {
                          return (
                            <div 
                              key={slotKey} 
                              className="flex flex-col items-center justify-center gap-1 w-24 h-24 border-2 border-dashed border-muted rounded-lg opacity-20"
                            >
                              {/* Optional: Add a subtle icon or leave empty */}
                            </div>
                          );
                        }

                        // If there IS a pokemon, render your existing card logic
                        return (
                          <div
                            key={slotKey}
                            className={`flex flex-col items-center gap-1 ${removeMode ? "cursor-pointer opacity-80 hover:opacity-50 hover:ring-2 hover:ring-red-500 rounded-lg" : ""}`}
                            onClick={async () => {
                              if (!removeMode) return;
                              if (!window.confirm(`Remove ${pokemon.name} from this box?`)) return;
                              try {
                                const res = await fetch(`http://localhost:3500/myBoxes/${boxIndex}/${pokemon.name}`, { method: "DELETE" });
                                if (!res.ok) throw new Error(`Request failed: ${res.status}`);
                                const json = await res.json();
                                const resolvedBoxes = await resolveBoxes(json.allBoxes, abilityOptions, itemOptions, natureOptions, movesOptions, typesOptions);
                                setP1Boxes(resolvedBoxes);
                              } catch (err) {
                                console.error(`Failed to remove pokemon: ${err}`);
                                window.alert(`Failed to remove: ${err}`);
                              }
                              setRemoveMode(false);
                            }}
                          >
                            <div
                              draggable
                              // Use the slotKey here so handleDrop knows exactly which slot was emptied
                              onDragStart={() => handleDragStart(pokemon, `box-${boxIndex}-${slotKey}`)}
                              className="relative group cursor-grab active:cursor-grabbing"
                            >
                              <img
                                src={(pokemon.gender === "F" && pokemon.femaleSprite) ? 
                                      FEMALE_POKEMON_SPRITES(pokemon.ID) : pokemon.sprite}
                                alt={pokemon.name}
                                className="w-24 h-24 hover:scale-110 transition-transform"
                              />
                              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-white text-xs p-2 rounded whitespace-nowrap z-10 pointer-events-none">
                                <p className="font-semibold">{pokemon.name}</p>
                                <p>Lv.{pokemon.level}</p>
                                <p>{pokemon.nature.name}</p>
                                <p>{pokemon.item.name}</p>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-1 items-center justify-center">
                              {pokemon.types.map((type) => (
                                <div
                                  key={type.name}
                                  className={`text-xs px-2 py-1 rounded-full text-white font-medium border type-bg-${type.name.toLowerCase()} type-border-${type.name.toLowerCase()}`}
                                >
                                  {type.name}
                                </div>
                              ))}
                            </div>
                            
                            <Button
                              size="sm"
                              variant={isInBench(pokemon, 1) ? "destructive" : "default"}
                              title={isInBench(pokemon, 1) ? `Remove ${pokemon.name} from team` : `Add ${pokemon.name} to team`}
                              className="h-4 bg-[#504B3A] shadow-sm text-[8px] px-1 py-0 cursor-pointer"
                              onClick={() => togglePokemonInBench(pokemon, 1)}
                            >
                              {isInBench(pokemon, 1) ? (
                                <>
                                  <X className="w-2 h-2" />
                                  Remove
                                </>
                              ) : (
                                <>
                                  <Plus className="w-2 h-10" />
                                  Add
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

    <ImportModal 
      isOpen={importModalOpen} 
      onClose={() => setImportModalOpen(false)}
      onImport={handleImportModal}
    />

    </div>
  )
}