"use client"

import React, { useEffect, useState, Fragment } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Plus, ChevronLeft, ChevronRight, Save, Trash2, Shield, Sword, Heart, Zap } from "lucide-react"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const MEGA_SYMBOL = "/mega-stone.jpg";
const ITEM_SPRITE = (itemName: string) => `/sprites/items/${itemName.toLowerCase().replaceAll(/[^a-z0-9]/g, "-")}.png`
const TYPE_SPRITES = (typeName: string) => `/sprites/types/generation-viii/brilliant-diamond-and-shining-pearl/${typeName}.png`
const TYPE_ICONS = (typeName: string) => `/sprites/types/icons/${typeName}.jpg`
const POKEMON_SPRITES = (pokemonID: string) => `./sprites/pokemon/${pokemonID}.png`
const FEMALE_POKEMON_SPRITES = (pokemonID: string) => `./sprites/pokemon/female/${pokemonID}.png`

// fetch stuff from the backend 

type teamPayload = {
  "teamName": string
}

type pokemonPayload = {
  "pokemonData": string
}

const formatPokemonForAPI = (pokemon: Pokemon) => ({
  name: pokemon.name,
  level: pokemon.level,
  item: pokemon.item.name,
  nature: pokemon.nature.name,
  evs: {
    hp: pokemon.EVs.HP,
    atk: pokemon.EVs.Atk,
    def: pokemon.EVs.Def,
    spa: pokemon.EVs.SpA,
    spd: pokemon.EVs.SpD,
    spe: pokemon.EVs.Spe
  },
  ivs: {
    hp: pokemon.IVs.HP,
    atk: pokemon.IVs.Atk,
    def: pokemon.IVs.Def,
    spa: pokemon.IVs.SpA,
    spd: pokemon.IVs.SpD,
    spe: pokemon.IVs.Spe
  },
  boosts: {
    atk: pokemon.statBoosts?.Atk || 0,
    def: pokemon.statBoosts?.Def || 0,
    spa: pokemon.statBoosts?.SpA || 0,
    spd: pokemon.statBoosts?.SpD || 0,
    spe: pokemon.statBoosts?.Spe || 0
  },
  ability: pokemon.ability.name,
  status: pokemon.status,
  currentHP: pokemon.currentHp,
  maxHP: pokemon.maxHp
});

// box fetches

async function fetchMyBoxes() {
  const res = await fetch("http://localhost:3500/myBoxes", {
    method: "GET"
  });

  if (!res.ok) throw new Error (`Request failed: ${res.status}`);

  return res.json()
}
async function fetchAddBox() {
  const res = await fetch("http://localhost:3500/myBoxes", {
    method: "POST"
  });

  if (!res.ok) throw new Error (`Request failed: ${res.status}`);

  return res.json()
}
async function fetchRemoveBox(index: string) {
  const res = await fetch(`http://localhost:3500/myBoxes/${index}`, {
    method: "DELETE"
  });

  if (!res.ok) throw new Error (`Request failed: ${res.status}`);

  return res.json()
}
async function fetchClearBox(index: string) {
  const res = await fetch(`http://localhost:3500/myBoxes/${index}`, {
    method: "PUT"
  });
  if (!res.ok) throw new Error (`Request failed: ${res.status}`); 
  return res.json();
}
async function fetchAddToBox(boxIndex: string, payload: pokemonPayload) {
  const res = await fetch(`http://localhost:3500/myBoxes/${boxIndex}`, {
    method: "POST", 
    headers: {
      "Content-Type": "application/json"
    }, 
    body: JSON.stringify(payload)});

    if (!res.ok) throw new Error (`Request failed: ${res.status}`);

    return res.json();
}




async function fetchAddTeam(playerId: string, payload: teamPayload) {
  const res = await fetch(`http://localhost:3500/teams/${playerId}`, {
    method: "POST", 
    headers: {
      "Content-Type": "application/json"
    }, 
    body: JSON.stringify(payload)});

    if (!res.ok) {
      throw new Error (`Request failed: ${res.status}`);
    } 

    return res.json();
}

async function fetchRemoveTeam(playerId: string, teamName: string) {
  const res = await fetch(`http://localhost:3500/teams/${playerId}/${teamName}`, {
    method: "DELETE"
  }); 

  if (!res.ok) {
    throw new Error (`Request failed: ${res.status}`); 
  } 

  return res.json();
}

async function fetchAllTeams(playerId: string) {
  const res = await fetch(`http://localhost:3500/teams/${playerId}`, {
    method: "GET"
  }); 

  if (!res.ok) {
    throw new Error (`Request failed: ${res.status}`)
  }

  return res.json();
}

async function fetchRemoveAllTeams(playerId: string) {
  const res = await fetch(`http://localhost3500/${playerId}`, {
    method: "DELETE"
  }); 

  if (!res.ok) {
    throw new Error (`Request failed: ${res.status}`)
  }

  return res.json();
}

async function fetchCalcStats(payload: pokemonPayload) {
  const res = await fetch('http://localhost:3500/misc/stats', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function fetchItemsData() {
  const res = await fetch('http://localhost:3500/misc/items', {
    method: "GET"}); 

    if (!res.ok) throw new Error (`Request failed: ${res.status}`);

    return res.json();
}

async function fetchAbilityData() {
  const res = await fetch('http://localhost:3500/misc/abilities', {
    method: "GET"
  })

  if (!res.ok) throw new Error (`Request failed: ${res.status}`)

  return res.json()
}

async function fetchNaturesData() {
  const res = await fetch('http://localhost:3500/misc/natures', {
    method: "GET"}); 

    if (!res.ok) throw new Error (`Request failed: ${res.status}`);

    return res.json();
}

async function fetchMovesData() {
  const res = await fetch('http://localhost:3500/misc/moves', {
    method: "GET"}); 

    if (!res.ok) throw new Error (`Request failed: ${res.status}`); 

    return res.json();
}

async function fetchTypesData() {
  const res = await fetch('http://localhost:3500/misc/types', {
    method: "GET"}); 

    if (!res.ok) throw new Error (`Request failed: ${res.status}`);

    return res.json();
}

async function fetchStatuses() {
  const res = await fetch('http://localhost:3500/misc/statuses', {
    method: "GET"});

    if (!res.ok) throw new Error (`Request failed: ${res.status}`); 

    return res.json();
}

// retreive the data from the endpoint's json


async function addTeam(playerID: string, payload: teamPayload) {
  const teamJSON = await fetchAddTeam(playerID, payload);
  return teamJSON.currentBox;
} 

async function removeTeam(playerID: string, teamName: string) {
  const teamJSON = await fetchRemoveTeam(playerID, teamName); 
  return teamJSON.currentBox;
}

async function removeAllTeams(playerID: string) {
  const teamsJSON = await fetchRemoveAllTeams(playerID);
  return teamsJSON.currentBox;
}

async function addPokemon(boxIndex: string, pokemonData: string) {
  const newPokemonJSON = await fetchAddToBox(boxIndex, { pokemonData });
  return {
    addPokemon: newPokemonJSON.addedPokemon,
    updatedBox: newPokemonJSON.allBoxes
  }
}

async function calcStats(pokemon: Pokemon): Promise<PokemonStats> {
  const json = await fetchCalcStats({ pokemonData: { 
    baseStats: pokemon.baseStats,
    EVs: pokemon.EVs,
    IVs: pokemon.IVs,
    nature: pokemon.nature,
    level: pokemon.level,
    statBoosts: pokemon.statBoosts,
  } as any });
  return json.stats;
}


// data types

interface PokemonStats {
  HP: number
  Atk: number
  Def: number
  SpA: number
  SpD: number
  Spe: number
}

type PokemonStat = "HP" | "Atk" | "Def" | "SpA" | "SpD" | "Spe";

type Gender = "M" | "F" | "Both" | "N";

interface Pokemon {
  name: string
  form: PokemonForm
  ID: string
  sprite: string
  type1 : PokemonType
  type2 : PokemonType
  types: PokemonType[]
  forms: PokemonForms
  level: number
  nature: Nature
  item: Item
  ability: Ability
  abilities: Ability[]
  baseStats: PokemonStats
  EVs: PokemonStats
  IVs: PokemonStats
  maxHp: number
  currentHp: number
  finalStats: PokemonStats
  statBoosts?: Partial<PokemonStats>
  moveset: PokemonMove[]
  allMoves: PokemonMove[]
  gender: Gender
  femaleSprite: boolean
  status: string
  switchInScore: number
  weaknesses?: string[] // Types with 2x damage
  doubleWeaknesses?: string[] // Types with 4x damage
  resistances?: string[] // Types with 0.5x damage
  doubleResistances?: string[] // Types with 0.25x damage
  immunities?: string[] // Types with 0x damage
  boxKey?: string
  boxIndex?: number
}

interface TurnData {
  turnNumber: number
  player1Hp: number
  player2Hp: number
  action: string
}

interface Box {
  [key: string]: Pokemon | null
}

interface TrainerInfo {
  name: string, 
  rules: string, 
  format: string, 
  partner: string, 
  myPartner: string
}

interface Team {
  [key: string]: Pokemon | TrainerInfo | null;
}

interface Teams {
  [key: string]: Team
}

interface Items {
  [key: string]: Item
}

interface Item {
  name: string
}

interface Natures {
  [key: string]: Nature
}

interface Nature {
  name: string, 
  increase: PokemonStat, 
  decrease: PokemonStat
}

interface PokemonType {
  name: string, 
  Normal: number, 
  Fire: number, 
  Water: number, 
  Eletric: number, 
  Grass: number, 
  Ice: number, 
  Fighting: number, 
  Poison: number, 
  Ground: number, 
  Flying: number, 
  Psychic: number, 
  Bug: number, 
  Rock: number, 
  Ghost: number, 
  Dragon: number, 
  Dark: number, 
  Steel: number, 
  Fairy: number 
}

interface Ability {
  name: string, 
  description: string, 
  toggle: boolean
}

interface PokemonMove {
  name: string,
  [key: string]: any
}

interface PokemonForm {
  formName: string 
  ID: number
  sprite: string
  type1: PokemonType, 
  type2: PokemonType
  types: PokemonType[]
  ability: Ability
  abilities: Ability[]
  baseStats: PokemonStats 
  finalStats: PokemonStats
  allMoves: PokemonMove[]
}

interface PokemonForms {
  [key: string]: PokemonForm
}

interface Status {
  name: string, 
  descripton: string[]
}

const MOVES_OPTIONS = async () => {
  const movesListJSON = await fetchMovesData(); 
  const movesList = movesListJSON.movesData
  return movesList;
}

const ABILITY_OPTIONS = async () => {
  const abilityListJSON = await fetchAbilityData(); 
  const abilityList = abilityListJSON.abilitiesData
  return abilityList;
}

const ITEMS_OPTIONS = async () => {
  const itemsListJSON = await fetchItemsData(); 
  const itemsList = itemsListJSON.items
  return itemsList;
}

const NATURE_OPTIONS = async () => {
  const natureListJSON = await fetchNaturesData(); 
  const naturesList = natureListJSON.natures;
  return naturesList;
}

const TYPE_OPTIONS = async () => {
  const typeListJSON = await fetchTypesData(); 
  const typeList = typeListJSON.types;
  return typeList;
}

const STATUS_OPTIONS = async () => {
  const statusListJSON = await fetchStatuses(); 
  const statusList = statusListJSON.statuses;
  return statusList;
}

const TYPE_CHART: Record<string, string[]> = {
  Normal: ["Fighting"],
  Fire: ["Water", "Ground", "Rock"],
  Water: ["Electric", "Grass"],
  Electric: ["Ground"],
  Grass: ["Fire", "Ice", "Poison", "Flying", "Bug"],
  Ice: ["Fire", "Fighting", "Rock", "Steel"],
  Fighting: ["Flying", "Psychic", "Fairy"],
  Poison: ["Ground", "Psychic"],
  Ground: ["Water", "Grass", "Ice"],
  Flying: ["Electric", "Ice", "Rock"],
  Psychic: ["Bug", "Ghost", "Dark"],
  Bug: ["Fire", "Flying", "Rock"],
  Rock: ["Water", "Grass", "Fighting", "Ground", "Steel"],
  Ghost: ["Ghost", "Dark"],
  Dragon: ["Ice", "Dragon", "Fairy"],
  Dark: ["Fighting", "Bug", "Fairy"],
  Steel: ["Fire", "Fighting", "Ground"],
  Fairy: ["Poison", "Steel"],
}

const getWeaknesses = (types: PokemonType[]): string[] => {
  const weaknesses = new Set<string>()
  types.forEach((type) => {
    const typeWeaknesses = TYPE_CHART[type.name] || []
    typeWeaknesses.forEach((w) => weaknesses.add(w))
  })
  return Array.from(weaknesses)
}

const getTypeEffectiveness = (types: PokemonType[]) => {
  // This will be populated by backend, returning empty arrays for now
  return {
    weaknesses: [],
    doubleWeaknesses: [],
    resistances: [],
    doubleResistances: [],
    immunities: [],
  }
}

const getTypeColor = (type: PokemonType): string => {
  const colors: Record<string, string> = {
    Normal: "#A8A878",
    Fire: "#F08030",
    Water: "#6890F0",
    Electric: "#F8D030",
    Grass: "#78C850",
    Ice: "#98D8D8",
    Fighting: "#C03028",
    Poison: "#A040A0",
    Ground: "#E0C068",
    Flying: "#A890F0",
    Psychic: "#F85888",
    Bug: "#A8B820",
    Rock: "#B8A038",
    Ghost: "#705898",
    Dragon: "#7038F8",
    Dark: "#705848",
    Steel: "#B8B8D0",
    Fairy: "#EE99AC",
  }
  return colors[type.name] || "#A8A878"
}

const getStatusStyle = (status: string): string => {
  const styles: Record<string, string> = {
    Healthy:        "bg-green-100 text-green-800",
    Burn:           "bg-red-200 text-red-900",
    Freeze:         "bg-blue-200 text-blue-900",
    Paralysis:      "bg-yellow-200 text-yellow-900",
    Poison:         "bg-purple-200 text-purple-900",
    "Badly Poison": "bg-[#800080] text-white",
    Sleep:          "bg-gray-300 text-gray-1000",
    Fainted:        "bg-gray-700 text-white",
  };
  return styles[status] ?? "bg-gray-100 text-gray-700";
};

function createPokemon(
  name: string,
  ID: string,
  sprite: string,
  type1: PokemonType,
  type2: PokemonType,
  level: number,
  nature: Nature,
  item: Item,
  ability: Ability,
  abilities: Ability[],
  baseStats: PokemonStats,
  EVs: PokemonStats,
  IVs: PokemonStats,
  maxHp: number,
  finalStats: PokemonStats,
  moveset: PokemonMove[],
  allMoves: PokemonMove[],
  form: PokemonForm,
  forms: PokemonForms,
  gender: Gender,
  femaleSprite: boolean, 
  statBoosts: Partial<PokemonStats>

): Pokemon {

  // const addedPokemon = addPokemon(playerID, )

  return {
    ID,
    name,
    gender,
    form,
    level,
    maxHp,
    'currentHp': maxHp,
    nature,
    item,
    ability,
    abilities,
    baseStats,
    IVs,
    EVs,
    statBoosts,
    finalStats,
    moveset,
    allMoves,
    sprite,
    femaleSprite,
    type1, 
    type2,
    types: type2.name !== "None" ? [type1, type2] : [type1],
    forms,
    status: "Healthy",
    switchInScore: 0
  }
  
}

export default function PokemonBattleSimulator() {

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

  const [itemOptions, setItemOptions] = useState<Items>({}); 
  const [natureOptions, setNatureOptions] = useState<Natures>({}); 
  const [genderOptions, setGenderOptions] = useState<Gender>("Both");
  const [statusOptions, setStatusOptions] = useState<Status[]>([]);

  const [turns, setTurns] = useState<TurnData[]>([
    { turnNumber: 1, player1Hp: 150, player2Hp: 150, action: "Battle Start" },
    { turnNumber: 2, player1Hp: 135, player2Hp: 120, action: "Pikachu used Thunderbolt!" },
    { turnNumber: 3, player1Hp: 100, player2Hp: 120, action: "Charizard used Flamethrower!" },
    { turnNumber: 4, player1Hp: 100, player2Hp: 80, action: "Pikachu used Thunderbolt!" },
  ])

  const [currentTurn, setCurrentTurn] = useState(1)
  const [draggedPokemon, setDraggedPokemon] = useState<{ pokemon: Pokemon; source: string } | null>(null)

  const [selectedMove, setSelectedMove] = useState<{player: Number, slot: Number, moveIdx: number} | null>(null)

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

  const [moveCrits, setMoveCrits] = useState<Record<string, boolean[]>>({});
  const [moveZPowered, setMoveZPowered] = useState<Record<string, boolean[]>>({});
  const [abilityToggles, setAbilityToggles] = useState<Record<string, Record<string, boolean>>>({});
  
  async function fetchCalculateDamage(
    attacker: Pokemon,
    attackerPlayer: number,
    attackerSlot: number,
    defender: Pokemon,
    defenderPlayer: number,
    defenderSlot: number,
    move: PokemonMove,
    field: { weather?: string, terrain?: string }
  ) {
    const attackerKey = `p${attackerPlayer}-${attackerSlot}`;
    const defenderKey = `p${defenderPlayer}-${defenderSlot}`;
    
    // Merge attacker and defender toggles
    const mergedToggles = {
      ...(abilityToggles[attackerKey] || {}),
      ...(abilityToggles[defenderKey] || {})
    };

    try {
      const res = await fetch("http://localhost:3500/damage/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attacker: formatPokemonForAPI(attacker),
          defender: formatPokemonForAPI(defender),
          move: { name: move.name },
          field: field,
          abilityToggles: mergedToggles
        })
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      return res.json();
    } catch (err) {
      console.error("Failed to calculate damage:", err);
      throw err;
    }
  }


  // on initial load
  useEffect(() => {
    async function loadInitialData() {
      try {

        // misc stuff
        const abilityList = await ABILITY_OPTIONS();
        const itemsList = await ITEMS_OPTIONS(); 
        const naturesList = await NATURE_OPTIONS();
        const movesList = await MOVES_OPTIONS();
        const typeList = await TYPE_OPTIONS(); 
        const statusList = await STATUS_OPTIONS();


        // my boxes 
        const myBoxesJSON = await fetchMyBoxes();
        const loadedBoxes: Box[] = myBoxesJSON.allBoxes

        const myBoxes = loadedBoxes.map(box => {
          const newBox: Box = {};
          for (const [key, pokemon] of Object.entries(box)) {

            if (!pokemon) continue;
            const resolvedItem = typeof pokemon.item === 'string' ? itemsList[pokemon.item] : pokemon.item;
            const resolvedAbility = typeof pokemon.ability === 'string' ? abilityList[pokemon.ability] : pokemon.ability;
            const resolvedAbilities = pokemon.abilities.map(ability => typeof ability === 'string' ? abilityList[ability] : ability);
            const resolvedMoves = (pokemon.moveset as (string | PokemonMove)[]).map(move => typeof move === 'string' ? movesList[move.toLowerCase().replaceAll(/[^a-z0-9]/g, "")] : move)
            const resolvedAllMoves = (pokemon.allMoves as (string | PokemonMove)[]).map(move => typeof move === 'string' ? movesList[move.toLowerCase().replaceAll(/[^a-z0-9]/g, "")] : move)
            const resolvedNature = typeof pokemon.nature === 'string' ? naturesList[pokemon.nature] : pokemon.nature;
            const resolvedType1 = typeof pokemon.type1 === 'string' ? typeList[pokemon.type1] : pokemon.type1;
            const resolvedType2 = typeof pokemon.type2 === 'string' ? typeList[pokemon.type2] : pokemon.type2;
            const resolvedForm = typeof pokemon.form === 'string' ? pokemon.forms[pokemon.form] : pokemon.form;
            const resolvedStatBoosts: Partial<PokemonStats> = pokemon.statBoosts || {Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0}

            for (const form of Object.values(pokemon.forms)) {
              form.ability = typeof form.ability === 'string' ? abilityList[form.ability] : form.ability;              
              form.abilities = form.abilities.map(ability => typeof ability === 'string' ? abilityList[ability] : ability);              
              form.allMoves = (form.allMoves as (string | PokemonMove)[]).map(move => 
                  typeof move === 'string' ? movesList[move.toLowerCase().replaceAll(/[^a-z0-9]/g, "")] : move
                );              
              form.type1 = typeof form.type1 === 'string' ? typeList[form.type1] : form.type1;              
              form.type2 = typeof form.type2 === 'string' ? typeList[form.type2] : form.type2;              
              form.types = form.type2 && form.type2.name !== "None" ? [form.type1, form.type2] : [form.type1];              
              form.sprite = POKEMON_SPRITES(String(form.ID));            }

            newBox[key] = createPokemon(
              pokemon.name, 
              String(pokemon.ID), 
              POKEMON_SPRITES(pokemon.ID), 
              resolvedType1, 
              resolvedType2,
              pokemon.level, 
              resolvedNature, 
              resolvedItem,  
              resolvedAbility, 
              resolvedAbilities,
              pokemon.baseStats, 
              pokemon.EVs, 
              pokemon.IVs, 
              pokemon.finalStats.HP, 
              pokemon.finalStats, 
              resolvedMoves, 
              resolvedAllMoves, 
              resolvedForm,
              pokemon.forms, 
              pokemon.gender,
              pokemon.femaleSprite,
              resolvedStatBoosts
            );
          }
          console.log(newBox);
          return newBox;
        });

        setP1Boxes(myBoxes);
        const savedNames = JSON.parse(localStorage.getItem("p1BoxNames") || "[]");
        const defaultNames = myBoxesJSON.allBoxes.map((_: any, i: number) => savedNames[i] ?? `Box ${i + 1}`);
        setP1BoxNames(defaultNames);
        localStorage.setItem("p1BoxNames", JSON.stringify(defaultNames));

        // set natures and status lists
        setItemOptions(itemsList);
        setNatureOptions(naturesList);
        setStatusOptions(statusList);


        // my teams
        const myTeamsJSON = await fetchAllTeams('1')
        setP1Teams(myTeamsJSON.allTeams);


        // enemy teams
        const enemyTeamsJSON = await fetchAllTeams('2');
        const resolvedP2Teams: Teams = {};

        for (const [teamName, team] of Object.entries(enemyTeamsJSON.allTeams as Teams)) {
          const resolvedTeam: Team = {};
          for (const [slotKey, entry] of Object.entries(team)) {
            if (!entry || slotKey === 'trainerInfo') {
              resolvedTeam[slotKey] = entry;
              continue;
            }
            const p = entry as any;

            const resolvedItem: Item = typeof p.item === 'string' ? { name: p.item } : p.item;
            const resolvedAbility: Ability = typeof p.ability === 'string' ? { name: p.ability } : p.ability;
            const resolvedAbilities: Ability[] = (p.abilities as any[]).map(a => typeof a === 'string' ? { name: a } : a);
            const resolvedNature: Nature = typeof p.nature === 'string' ? naturesList[p.nature] : p.nature;
            const resolvedType1: PokemonType = typeof p.type1 === 'string' ? (typeList[p.type1] ?? { name: p.type1 }) : p.type1;
            const resolvedType2: PokemonType = typeof p.type2 === 'string' ? (typeList[p.type2] ?? { name: p.type2 }) : p.type2;
            const resolvedForm: PokemonForm = typeof p.form === 'string' ? p.forms[p.form] : p.form;
            const resolvedStatBoosts: Partial<PokemonStats> = p.statBoosts || { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 };
            const resolvedMoves: PokemonMove[] = (p.moveset as any[]).map(m => typeof m === 'string' ? (movesList[m.toLowerCase().replaceAll(/[^a-z0-9]/g, "")] ?? { name: m }) : m);
            const resolvedAllMoves: PokemonMove[] = (p.allMoves as any[]).map(m => typeof m === 'string' ? (movesList[m.toLowerCase().replaceAll(/[^a-z0-9]/g, "")] ?? { name: m }) : m);

            // Resolve each form
            for (const form of Object.values(p.forms) as any[]) {
              form.ability = typeof form.ability === 'string' ? { name: form.ability } : form.ability;
              form.abilities = (form.abilities as any[]).map(a => typeof a === 'string' ? { name: a } : a);
              form.allMoves = (form.allMoves as any[]).map(m => typeof m === 'string' ? (movesList[m.toLowerCase().replaceAll(/[^a-z0-9]/g, "")] ?? { name: m }) : m);
              form.type1 = typeof form.type1 === 'string' ? (typeList[form.type1] ?? { name: form.type1 }) : form.type1;
              form.type2 = typeof form.type2 === 'string' ? (typeList[form.type2] ?? { name: form.type2 }) : form.type2;
              form.types = form.type2 && form.type2.name !== "None" ? [form.type1, form.type2] : [form.type1];
            }

            resolvedTeam[slotKey] = createPokemon(
              p.name,
              String(p.ID),
              POKEMON_SPRITES(p.ID),           // already a full URL in the JSON
              resolvedType1,
              resolvedType2,
              p.level,
              resolvedNature,
              resolvedItem,
              resolvedAbility,
              resolvedAbilities,
              p.baseStats,
              p.EVs,
              p.IVs,
              p.finalStats.HP,
              p.finalStats,
              resolvedMoves,
              resolvedAllMoves,
              resolvedForm,
              p.forms,
              p.gender,
              p.femaleSprite,
              resolvedStatBoosts
            );
          }
          resolvedP2Teams[teamName] = resolvedTeam;
        }

        setP2Teams(resolvedP2Teams);
        setP2OriginalTeams(JSON.parse(JSON.stringify(resolvedP2Teams)));

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

    const deleteP1Team = () => {
      if (!p1SelectedTeamIndex) {
        setPlayer1Bench(Array(6).fill(null));
        return;
      }
      if (!window.confirm(`Delete team "${p1SelectedTeamIndex}"?`)) return;
      setP1Teams(prev => {
        const updated = { ...prev };
        delete updated[p1SelectedTeamIndex];
        return updated;
      });
      setP1SelectedTeamIndex("");
      setPlayer1Bench(Array(6).fill(null));
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

  const resolveBoxes = async (rawBoxes: any[]): Promise<Box[]> => {
    const [abilityListJSON, itemsListJSON, naturesListJSON, movesListJSON, typeListJSON] = await Promise.all([
      fetchAbilityData(), fetchItemsData(), fetchNaturesData(), fetchMovesData(), fetchTypesData()
    ]);
    const abilityList = abilityListJSON.abilitiesData;
    const itemsList = itemsListJSON.items;
    const naturesList = naturesListJSON.natures;
    const movesList = movesListJSON.movesData;
    const typeList = typeListJSON.types;

    return rawBoxes.map(box => {
      const newBox: Box = {};
      for (const [key, pokemon] of Object.entries(box) as [string, any][]) {
        if (!pokemon) continue;
        const resolvedItem = typeof pokemon.item === 'string' ? itemsList[pokemon.item] : pokemon.item;
        const resolvedAbility = typeof pokemon.ability === 'string' ? abilityList[pokemon.ability] : pokemon.ability;
        const resolvedAbilities = pokemon.abilities.map((a: any) => typeof a === 'string' ? abilityList[a] : a);
        const resolvedMoves = (pokemon.moveset as (string | PokemonMove)[]).map(m => typeof m === 'string' ? movesList[m.toLowerCase().replaceAll(/[^a-z0-9]/g, "")] : m);
        const resolvedAllMoves = (pokemon.allMoves as (string | PokemonMove)[]).map(m => typeof m === 'string' ? movesList[m.toLowerCase().replaceAll(/[^a-z0-9]/g, "")] : m);
        const resolvedNature = typeof pokemon.nature === 'string' ? naturesList[pokemon.nature] : pokemon.nature;
        const resolvedType1 = typeof pokemon.type1 === 'string' ? typeList[pokemon.type1] : pokemon.type1;
        const resolvedType2 = typeof pokemon.type2 === 'string' ? typeList[pokemon.type2] : pokemon.type2;
        const resolvedForm = typeof pokemon.form === 'string' ? pokemon.forms[pokemon.form] : pokemon.form;
        const resolvedStatBoosts: Partial<PokemonStats> = pokemon.statBoosts || { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 };

        for (const form of Object.values(pokemon.forms) as any[]) {
          form.ability = typeof form.ability === 'string' ? abilityList[form.ability] : form.ability;
          form.abilities = form.abilities.map((a: any) => typeof a === 'string' ? abilityList[a] : a);
          form.allMoves = (form.allMoves as (string | PokemonMove)[]).map(m => typeof m === 'string' ? movesList[m.toLowerCase().replaceAll(/[^a-z0-9]/g, "")] : m);
          form.type1 = typeof form.type1 === 'string' ? typeList[form.type1] : form.type1;
          form.type2 = typeof form.type2 === 'string' ? typeList[form.type2] : form.type2;
          form.types = form.type2 && form.type2.name !== "None" ? [form.type1, form.type2] : [form.type1];
          form.sprite = POKEMON_SPRITES(String(form.ID));
        }

        newBox[key] = createPokemon(
          pokemon.name, String(pokemon.ID), POKEMON_SPRITES(pokemon.ID),
          resolvedType1, resolvedType2, pokemon.level, resolvedNature, resolvedItem,
          resolvedAbility, resolvedAbilities, pokemon.baseStats, pokemon.EVs, pokemon.IVs,
          pokemon.finalStats.HP, pokemon.finalStats, resolvedMoves, resolvedAllMoves,
          resolvedForm, pokemon.forms, pokemon.gender, pokemon.femaleSprite, resolvedStatBoosts
        );
      }
      return newBox;
    });
  };

  const removeBox = async () => {
    if (p1Boxes.length <= 1) { window.alert("You must keep at least one box."); return; }
    if (!window.confirm(`Delete "${p1BoxNames[activeBoxIndex]}"? This cannot be undone.`)) return;
    try {
      const myBoxesJSON = await fetchRemoveBox(String(activeBoxIndex));
      const resolvedBoxes = await resolveBoxes(myBoxesJSON.allBoxes);
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
      const resolvedBoxes = await resolveBoxes(myBoxesJSON.allBoxes);
      setP1Boxes(resolvedBoxes);
    } catch (err) {
      updateActiveBox({});
    }
  };

  const [p1Hazards, setP1Hazards] = useState({ spikes: 0, tSpikes: 0, sRock: false, reflect: false, lightScreen: false, protect: false, stickyWebs: false, leechSeed: false, helpingHand: false, tailWind: false, flowerGift: false, friendGuard: false, auroraVeil: false, switchingOut: false })
  const [p2Hazards, setP2Hazards] = useState({ spikes: 0, tSpikes: 0, sRock: false, reflect: false, lightScreen: false, protect: false, stickyWebs: false, leechSeed: false, helpingHand: false, tailWind: false, flowerGift: false, friendGuard: false, auroraVeil: false, switchingOut: false })

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

const activeIndices = battleMode === "singles" ? [0] : [0, 1]; 

  const handleImportModal = async () => {
  if (!importModalText.trim()) return;
  try {
    const result = await addPokemon(String(activeBoxIndex), importModalText);
    if (result.updatedBox) {
      const resolvedBoxes = await resolveBoxes(result.updatedBox);
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
      turns,
      notes,
    }
    setExportText(JSON.stringify(exportData, null, 2))
  }

  const handleAddTurn = () => {
    const newTurnNumber = turns.length + 1
    const newTurn: TurnData = {
      turnNumber: newTurnNumber,
      player1Hp: player1Bench[0]?.currentHp || 150,
      player2Hp: player2Bench[0]?.currentHp || 150,
      action: "Turn added",
    }
    setTurns([...turns, newTurn])
    setCurrentTurn(newTurnNumber)
  }

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
    if (player === 1) {
      setPlayer1Bench((prev) => prev.map((p, i) => (i === slotIndex && p ? { ...p, currentHp: Math.min(newHp, p.maxHp) } : p)))
    } else if (player === 2) {
      setPlayer2Bench((prev) => prev.map((p, i) => (i === slotIndex && p ? { ...p, currentHp: Math.min(newHp, p.maxHp) } : p)))
    }
  }

  const updatePokemonStatus = (player: 1 | 2, slotIndex: number, status: string) => {
    if (player === 1) {
      setPlayer1Bench((prev) => prev.map((p, i) => (i === slotIndex && p ? { ...p, status } : p)))
    } else if (player === 2 && player2Bench[0]) {
      setPlayer2Bench((prev) => prev.map((p, i) => (i === slotIndex && p ? { ...p, status } : p)))
    }
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
    if (player === 1) {
      setPlayer1Bench((prev) => prev.map((p, i) => (i === slotIndex && p ? { ...p, item: itemOptions[itemName] } : p)))
    } else if (player === 2 && player2Bench[0]) {
      setPlayer2Bench((prev) => prev.map((p, i) => (i === slotIndex && p ? { ...p, item: itemOptions[itemName] } : p)))
    }
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

  const updatePokemonMove = (
    team: "team1" | "team2",
    slotIndex: number,
    moveIndex: number,
    newMoveName?: string,
    newType?: string,
    newCategory?: string
  ) => {
    const setBench = team === "team1" ? setPlayer1Bench : setPlayer2Bench;
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
    statCategory: "baseStats" | "IVs" | "EVs" | "statBoosts",
    statName: keyof PokemonStats,
    slotIndex: number,
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

  const healTeam = () => {
    const heal = (p: Pokemon | null): Pokemon | null => 
      p ? { ...p, currentHp: p.maxHp, status: "Healthy" } : p;

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
          const isFainted = p.status === "Fainted"; 
          return {
            ...p, 
            currentHp: isFainted ? p.maxHp : 0, 
            status: isFainted ? "Healthy" : "Fainted",
          }
        }
        return p;
      }
    ))
    
  }

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

  const toggleMoveCrit = (key: string, moveIdx: number) => {
    setMoveCrits(prev => {
      const current = prev[key] ?? [false, false, false, false];
      const updated = [...current];
      updated[moveIdx] = !updated[moveIdx];
      return { ...prev, [key]: updated };
    });
  };

  const toggleMoveZ = (key: string, moveIdx: number) => {
    setMoveZPowered(prev => {
      const current = prev[key] ?? [false, false, false, false];
      const updated = [...current];
      updated[moveIdx] = !updated[moveIdx];
      return { ...prev, [key]: updated };
    });
  };

  const getAbilityToggle = (player: number, slotIndex: number, toggleName: string): boolean => {
    const key = `p${player}-${slotIndex}`;
    return abilityToggles[key]?.[toggleName] ?? false;
};

  const setAbilityToggle = (player: number, slotIndex: number, toggleName: string, value: boolean) => {
    const key = `p${player}-${slotIndex}`;
    setAbilityToggles(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [toggleName]: value
      }
    }));
  };

const getAbilityToggleName = (abilityName: string): string => {
  const toggleMap: Record<string, string> = {
    "Flash Fire": "flashFire",
    "Intimidate": "intimidate",
    "Minus": "plusMinus",
    "Plus": "plusMinus",
    "Slow Start": "slowStart",
    "Unburden": "unburden",
    "Stakeout": "stakeout",
    "Teraform Zero": "teraformZero"
  };
  return toggleMap[abilityName] || "";
};

const getAbilityToggleLabel = (abilityName: string): string => {
  const labelMap: Record<string, string> = {
    "Flash Fire": "Flash Fire Active",
    "Intimidate": "Intimidate Active",
    "Minus": "Ally Has Plus/Minus",
    "Plus": "Ally Has Plus/Minus",
    "Slow Start": "Slow Start Ended",
    "Unburden": "Item Consumed",
    "Stakeout": "Target Switched In",
    "Teraform Zero": "Teraform Zero Active"
  };
  return labelMap[abilityName] || "Active";
};

  // Refactored PokemonCard to be a function `renderPokemonCard`
  const renderPokemonCard = (pokemon: Pokemon | null, player: 1 | 2, slotIndex: number, battleMode: string) => {
    if (!pokemon) return null
    
    const isDoubles = battleMode === "doubles"
    const isTrueDoubles = doublesType === "True"

    
    const effectiveness = getTypeEffectiveness(pokemon.types)

    const weaknesses = getWeaknesses(pokemon.types)

    const EffectivenessTooltip = ({ effectiveness }: { effectiveness: any }) => {
              return (
                <div className="p-2 space-y-2 max-w-[200px]">
                  {/* Weaknesses */}
                  {(effectiveness.doubleWeaknesses.length > 0 || effectiveness.weaknesses.length > 0) && (
                    <div>
                      <p className="text-[10px] font-bold text-red-500 uppercase mb-1">Weaknesses</p>
                      <div className="flex flex-wrap gap-1">
                        {effectiveness.doubleWeaknesses.map((t: string) => <Badge key={t} className="text-[9px] h-4 bg-red-600">4× {t}</Badge>)}
                        {effectiveness.weaknesses.map((t: string) => <Badge key={t} className="text-[9px] h-4 bg-orange-500">2× {t}</Badge>)}
                      </div>
                    </div>
                  )}
                  {/* Resistances */}
                  {(effectiveness.doubleResistances.length > 0 || effectiveness.resistances.length > 0) && (
                    <div>
                      <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Resistances</p>
                      <div className="flex flex-wrap gap-1">
                        {effectiveness.resistances.map((t: string) => <Badge key={t} className="text-[9px] h-4 bg-green-500">½× {t}</Badge>)}
                        {effectiveness.doubleResistances.map((t: string) => <Badge key={t} className="text-[9px] h-4 bg-emerald-700">¼× {t}</Badge>)}
                      </div>
                    </div>
                  )}
                  {/* Immunities */}
                  {effectiveness.immunities.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Immune</p>
                      <div className="flex flex-wrap gap-1">
                        {effectiveness.immunities.map((t: string) => <Badge key={t} className="text-[9px] h-4 bg-slate-800">0× {t}</Badge>)}
                      </div>
                    </div>
                  )}
                </div>
              );
            };

    const hazards = player === 1 ? p1Hazards : p2Hazards; 

    return ( 

      <Card 
        key={`${player}-${slotIndex}`} 
        className={`relative overflow-hidden border-2 flex flex-col transition-all duration-300 ${
        isDoubles ? "h-[450px]" : "h-auto"
        }`}
      >

        {player === 2 ? 
          <p className="mx-auto text-xl font-bold">{`Switch-in Score: ${pokemon.switchInScore}`}</p>
          : <p></p>
        }
        <div className={`${isDoubles ? "overflow-y-auto flex-1 p-1 custom-scrollbar" : ""}`}>
          <CardContent className="p-4">

            <div className="grid grid-cols-4 p-2 gap-x-2 border-b border-white mb-7">
              {/* Incremental Hazard: Spikes */}
              <button 
                onClick={() => toggleHazard(player as 1 | 2, "spikes")}
                className={`bg-gray-400 h-8 text-sm font-bold cursor-pointer transition-colors ${hazards.spikes > 0 ? "bg-gray-700 text-white" : "text-white hover:bg-white hover:text-gray-400"}`}
              >
                SPIKES: {hazards.spikes}
              </button>

              {/* Incremental Hazard: T-Spikes */}
              <button 
                onClick={() => toggleHazard(player as 1 | 2, "tSpikes")}
                className={`bg-gray-400 h-8 text-sm font-bold cursor-pointer transition-colors ${hazards.tSpikes > 0 ? "bg-gray-700 text-white" : "text-white hover:bg-white hover:text-gray-400"}`}
              >
                T-SPIKES: {hazards.tSpikes}
              </button>

              {/* Boolean Hazards */}
              {[

                { id: "stealthRocks", label: "STEALTH ROCKS" },
                { id: "stickyWebs", label: "STICKY WEBS" }, 

              ].map((h) => (
                <button
                  key={h.id}
                  onClick={() => toggleHazard(player as 1 | 2, h.id)}
                  className={`bg-gray-400 h-8 text-sm font-bold cursor-pointer transition-colors ${hazards[h.id as keyof typeof hazards] ? "bg-gray-700 text-white" : "text-white hover:bg-white hover:text-gray-400"}`}
                >
                  {h.label}
                </button>
              ))}
            </div>


            {/*this is what I'm making sticky*/}
            <div className= {`${isDoubles ? "sticky top-0 z-10 bg-white p-1.5" : "p-3"}`}>
              <div className={`flex items-center justify-between ${isDoubles ? "gap-2" : "mb-3"}` }>
                <div className={`flex items-center gap-2`}>
                  <img
                    src={(pokemon.gender === "F" && pokemon.femaleSprite) ? 
                      FEMALE_POKEMON_SPRITES(pokemon.ID) : pokemon.sprite}
                    alt={pokemon.name}
                    className="w-25 h-25 pixelated"
                  />
                  <div>
                    <h3 className="font-bold text-lg">{pokemon.name}</h3>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">Lv.</span>
                      <Input
                        type="number"
                        value={pokemon.level}
                        onChange={(e) => updatePokemonLevel(player, slotIndex, e.target.value)}
                        className="w-16 h-7 text-sm mb-2 px-1 py-0"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <TooltipProvider>
                        {pokemon.types.map((type) => (
                          <Tooltip key={type.name} delayDuration={100}>
                            <TooltipTrigger asChild>
                              <img
                                className={`${isDoubles ? "h-4 w-24" : "h-5 w-25"} cursor-help shadow-sm transition-transform hover:scale-105`}
                                src={TYPE_SPRITES(type.name)}
                                alt={type.name}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="bg-white/95 backdrop-blur-md border shadow-xl p-0">
                              <EffectivenessTooltip effectiveness={effectiveness} />
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
                <>
                  <div className="grid grid-cols-[auto,1fr] gap-2 items-center">
                    <Label className="font-semibold mt-2.5">Form:</Label>

                    <Select 
                      value={pokemon.form.formName} 
                      onValueChange={(val) => updatePokemonForm(player, slotIndex, val)}
                    >
                      <SelectTrigger className="h-7  w-full">
                        <SelectValue placeholder="Select Form" />
                      </SelectTrigger>

                      <SelectContent position="popper" side="bottom">
                        {Object.keys(pokemon.forms).map((form) => (
                          <SelectItem key={form} value={form} className="">
                            {form}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Label className="font-semibold mt-2.5">Gender:</Label>

                    <Select 
                      value={pokemon.gender} 
                      onValueChange={(val) => updatePokemonGender(player, slotIndex, val as Gender)}
                    >
                      <SelectTrigger className="h-7">
                        <SelectValue placeholder="Select Form" />
                      </SelectTrigger>

                      <SelectContent position="popper" side="bottom">
                        {["M", "F", "Both", "N"].map((gender) => (
                          <SelectItem key={gender} value={gender} className="">
                            {gender}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                  </div>
                </>

                <div className="flex flex-col gap-1 mr-13">
                  <span className="inline-flex items-center justify-center whitespace-nowrap w-fit px-2 py-1 bg-cyan-600 text-primary-foreground rounded-full">{pokemon.nature.name}</span>
                  <span className="inline-flex items-center justify-center whitespace-nowrap gap-1 w-fit px-2 py-1 bg-primary text-primary-foreground rounded-full">
                    {pokemon.item.name}
                    <img className="h-10 w-10" src={ITEM_SPRITE(pokemon.item.name)}></img>
                  </span>
                  <span className="inline-flex items-center justify-center whitespace-nowrap w-fit px-2 py-1 bg-emerald-700 text-primary-foreground rounded-full">{pokemon.ability.name}</span>
                </div>
              
              </div>

            </div>
            
            {/* // editing HP */}
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${isDoubles ? "text-[10px] w-6" : "text-sm w-10"}`}>HP:</span>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  
                  {/* Current HP Input & Fixed Max HP Label */}
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={pokemon.currentHp}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(Number(e.target.value) || 0, pokemon.maxHp));
                        updatePokemonHp(player, slotIndex, val);
                      }}
                      className={`${isDoubles ? "h-6 w-13 text-[10px]" : "h-6 w-16"} px-1 py-0 text-center border-slate-300`}
                    />
                    <span className="text-muted-foreground font-bold">/ {pokemon.maxHp}</span>
                  </div>

                  {/* Linked Percentage Input */}
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={Math.round((pokemon.currentHp / pokemon.maxHp) * 100)}
                      onChange={(e) => {
                        const percent = Math.max(0, Math.min(Number(e.target.value) || 0, 100));
                        // Convert percentage back to raw HP for the state update
                        const calculatedHp = Math.round((percent / 100) * pokemon.maxHp);
                        updatePokemonHp(player, slotIndex, calculatedHp);
                      }}
                      className={`${isDoubles ? "h-6 w-13 text-[10px]" : "h-6 w-13"} px-1 py-0 text-center border-slate-300`}
                    />
                    <span className="text-muted-foreground font-bold">%</span>
                    <Button
                    size="sm"
                    variant="destructive"
                    className="h-6 px-2 text-[10px] font-bold transition-all hover:bg-red-700 hover:scale-105 active:scale-95"
                    onClick={() => faintPokemon(player, slotIndex)}
                    >
                      {pokemon.status === "Fainted" ? "Unfaint" : "Faint"}
                    </Button>
                  </div>
                </div>

                {/* Visual Health Bar */}
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-300 mb-3">
                  <div
                    className={`h-full transition-all duration-300 ${
                      (pokemon.currentHp / pokemon.maxHp) > 0.5 ? "bg-green-500" : (pokemon.currentHp / pokemon.maxHp) > 0.2 ? "bg-yellow-400" : "bg-red-500"
                    }`}
                    style={{ width: `${(pokemon.currentHp / pokemon.maxHp) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <p>{`Damage Rolls: ${player === 1 ? "player 1 damage rolls" : "player 2 damage rolls"}`}</p>

            {pokemon.baseStats && pokemon.statBoosts && (
              <div className="flex flex-col gap-3 border-t pt-2 mb-2">

                {/* ROW 1: Stat grid + displayed move boxes */}
                <div className="flex gap-6 items-center">

                  {/* Stat Grid */}
                  <div className="flex-shrink-0">
                    <Label className="text-sm font-semibold mb-1 block">Stats</Label>
                    <div className="grid grid-cols-[40px_50px_50px_60px_60px_60px] gap-x-1 gap-y-1 items-center text-[10px]">
                      <div></div>
                      <div className="text-muted-foreground font-medium text-center">Base</div>
                      <div className="text-muted-foreground font-medium text-center">IV</div>
                      <div className="text-muted-foreground font-medium text-center">EV</div>
                      <div className="text-muted-foreground font-medium text-center">Boost</div>
                      <div className="text-muted-foreground font-medium text-center">Final</div>

                      {(["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const).map((stat) => {
                        const statLabels = { HP: "HP", Atk: "Atk", Def: "Def", SpA: "SpA", SpD: "SpD", Spe: "Spe" }
                        const finalStat = pokemon.finalStats[stat];
                        const isIncrease = stat !== "HP" && pokemon.nature.increase === stat && pokemon.nature.increase !== pokemon.nature.decrease;
                        const isDecrease = stat !== "HP" && pokemon.nature.decrease === stat && pokemon.nature.increase !== pokemon.nature.decrease;
                        return (
                          <Fragment key={stat}>
                            <div className={`text-sm font-medium ${isIncrease ? "text-red-500 font-bold" : isDecrease ? "text-blue-500 font-bold" : "text-muted-foreground"}`}>
                              {statLabels[stat]}
                            </div>
                            <Input type="number" value={pokemon.baseStats![stat]} onChange={(e) => updatePokemonStat(player, "baseStats", stat, slotIndex, e.target.value)} className="h-8 text-sm px-0.5 w-full text-center" />
                            <Input type="number" value={Math.max(0, Math.min(pokemon.IVs[stat] || 0, 31))} onChange={(e) => updatePokemonStat(player, "IVs", stat, slotIndex, e.target.value)} className="h-7 text-sm px-0.5 w-full text-center" />
                            <Input type="number" value={Math.max(0, Math.min(pokemon.EVs[stat] || 0, 252))} onChange={(e) => updatePokemonStat(player, "EVs", stat, slotIndex, e.target.value)} className="h-7 text-lg px-0.5 w-full p-3" />
                            {stat === "HP" ? (
                              <div className="h-7" />
                            ) : (
                              <select value={pokemon.statBoosts![stat] || ""} onChange={(e) => updatePokemonStat(player, "statBoosts", stat, slotIndex, e.target.value || "0")} className="h-7 text-sm px-0.5 w-full text-center border rounded bg-background">
                                {[-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6].map((stage) => (
                                  <option key={stage} value={stage === 0 ? "" : stage.toString()}>
                                    {stage === 0 ? "--" : (stage > 0 ? `+${stage}` : stage)}
                                  </option>
                                ))}
                              </select>
                            )}
                            <div className="h-7 text-sm px-1 border rounded bg-muted flex items-center justify-center font-semibold w-full">{finalStat}</div>
                          </Fragment>
                        )
                      })}
                    </div>
                  </div>

                  {/* Displayed move boxes */}
                  <div className="flex-1 space-y-1">
                    <Label className="text-sm font-semibold mb-1 block">Moves</Label>
                    {pokemon.moveset.map((move, moveIdx) => {
                      const accuracy = move.accuracy;
                      const hasSecondary = move.secondary !== null && move.secondary !== undefined;
                      const isStatus = move.category === "Status";
                      const bgColor = isStatus ? "" : accuracy !== null && accuracy < 90 ? "bg-orange-100/60" : accuracy !== null && accuracy < 100 ? "bg-yellow-100/60" : "";
                      const textColor = isStatus ? "text-yellow-600 font-semibold" : hasSecondary ? "text-blue-600 font-semibold" : "text-foreground";
                      return (
                        <button
                          key={moveIdx}
                          onClick={() => {
                            const isSame = selectedMove?.player === player && selectedMove?.slot === slotIndex && selectedMove?.moveIdx === moveIdx;
                            setSelectedMove(isSame ? null : { player, slot: slotIndex, moveIdx });
                            // Your custom function here
                            console.log(`Selected move ${moveIdx} for player ${player}, slot ${slotIndex}`);
                          }}
                          className={`flex items-center justify-between rounded border px-3 py-1.5 text-base transition-all cursor-pointer ${
                            selectedMove?.player === player && selectedMove?.slot === slotIndex && selectedMove?.moveIdx === moveIdx
                              ? "border-blue-500 bg-blue-100 ring-2 ring-blue-300"
                              : `border-border ${bgColor} hover:shadow-md`
                          }`}
                        >
                          <span className={`truncate flex-1 font-medium ${textColor}`}>{move.name || `Move ${moveIdx + 1}`}</span>
                          <span className="text-sm text-muted-foreground ml-2 whitespace-nowrap">0 - 0%</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ROW 2: Nature/Item/Ability/Status dropdowns + Move editor rows */}
                <div className="flex items-start border-t pt-2">

                  {/* Left: dropdowns */}
                  <div className="flex-shrink-0 space-y-1 w-42">
                    <div className="grid grid-cols-[auto,1fr] gap-2 items-center">
                      <Label className="font-semibold whitespace-nowrap text-cyan-600">Nature:</Label>
                      <Select value={pokemon.nature.name} onValueChange={(val) => updatePokemonNature(player, slotIndex, val)}>
                        <SelectTrigger className="text-sm border rounded-md bg-background h-8 text-cyan-700 border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none">
                          <SelectValue placeholder="Select Nature"/>
                        </SelectTrigger>
                        <SelectContent position="popper" side="bottom">
                          {Object.keys(natureOptions).map((nature) => (
                            <SelectItem key={nature} value={nature} className="text-sm text-cyan-700">{nature}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-[auto,1fr] gap-2 items-center">
                      <Label className="font-semibold whitespace-nowrap text-primary">Item:</Label>
                      <Select value={pokemon.item.name} onValueChange={val => updatePokemonItem(player, slotIndex, val)}>
                        <SelectTrigger className="text-sm border rounded-md bg-background h-8 text-primary border-slate-300 focus:ring-2 outline-none">
                          <SelectValue placeholder="Select Item"/>
                        </SelectTrigger>
                        <SelectContent position="popper" side="bottom">
                          {Object.keys(itemOptions).map((item) => (
                            <SelectItem key={item} value={item} className="text-sm text-primary">{item}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-[auto,1fr] gap-2 items-center">
                      <Label className="font-semibold whitespace-nowrap text-emerald-700">Ability:</Label>
                      <div className="flex flex-row gap-2">
                        <Select value={pokemon.ability.name} onValueChange={val => updatePokemonAbility(player, slotIndex, val)}>
                          <SelectTrigger className="text-sm border rounded-md bg-background h-8 text-emerald-700 border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none">
                            <SelectValue placeholder="Select Ability"/>
                          </SelectTrigger>
                          <SelectContent position="popper" side="bottom">
                            {pokemon.abilities.map((ability) => (
                              <SelectItem key={ability.name} value={ability.name} className="text-sm text-emerald-700">{ability.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                          {pokemon.ability.toggle && (
                            <label className="flex items-center gap-1 text-xs mt-1">
                              <input
                                type="checkbox"
                                checked={getAbilityToggle(player, slotIndex, getAbilityToggleName(pokemon.ability.name))}
                                onChange={(e) => setAbilityToggle(player, slotIndex, getAbilityToggleName(pokemon.ability.name), e.target.checked)}
                                className="cursor-pointer"
                              />
                            </label>
                          )}
                      </div>
                    </div>
                    <div className="grid grid-cols-[auto,1fr] gap-2 items-center">
                      <Label className="font-semibold whitespace-nowrap">Status:</Label>
                      <Select value={pokemon.status} onValueChange={(val) => updatePokemonStatus(player, slotIndex, val)}>
                        <SelectTrigger className="text-sm px-2 py-1 border rounded bg-background h-8">
                          <SelectValue placeholder="Select Status"/>
                        </SelectTrigger>
                        <SelectContent position="popper" side="bottom">
                          {Object.keys(statusOptions).map((status) => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Right: Move editor rows */}
                  <div className="flex-1 space-y-1 self-center flex flex-col items-center mx-auto">
                    {pokemon.moveset.map((move, moveIdx) => {
                      const moveKey = `p${player}-${slotIndex}`;
                      const isCrit = moveCrits[moveKey]?.[moveIdx] ?? false;
                      const isZ = moveZPowered[moveKey]?.[moveIdx] ?? false;
                      const allTypes = ["Normal","Fire","Water","Electric","Grass","Ice","Fighting",
                        "Poison","Ground","Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy"];
                      return (
                        <div key={moveIdx} className="flex items-center gap-1">
                          <Select value={move.name} onValueChange={(val) => updatePokemonMove(player === 1 ? "team1" : "team2", slotIndex, moveIdx, val)}>
                            <SelectTrigger className="h-7 text-sm border-slate-300 w-37 flex-shrink-0">
                              <SelectValue placeholder={`Move ${moveIdx + 1}`} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="None" className="text-med text-muted-foreground">None</SelectItem>
                              {pokemon.allMoves.map((m) => (
                                <SelectItem key={m.name} value={m.name} className="text-xs">{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <div className="h-7 w-8 text-xs border rounded bg-muted flex items-center justify-center font-semibold flex-shrink-0">
                            {move.basePower ?? 0}
                          </div>

                          <Select value={move.type ?? "Normal"} onValueChange={(val) => updatePokemonMove(player === 1 ? "team1" : "team2", slotIndex, moveIdx, undefined, val)}>
                            <SelectTrigger className="h-8 w-8 p-0 rounded-full border-2 border-slate-300 flex-shrink-0 overflow-hidden [&>svg]:hidden aspect-square">
                              <img
                                src={TYPE_ICONS(move.type ?? "Normal")}
                                alt={move.type?.name ?? "Normal"}
                                className="w-full h-full object-cover rounded-full"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {allTypes.map((t) => (
                                <SelectItem key={t} value={t}>
                                  <div className="flex items-center gap-2">
                                    <img src={TYPE_ICONS(t)} alt={t} className="h-5 w-4 object-cover rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                    <span className="text-xs">{t}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select value={move.category ?? "Physical"} onValueChange={(val) => updatePokemonMove(player === 1 ? "team1" : "team2", slotIndex, moveIdx, undefined, undefined, val)}>
                            <SelectTrigger className="h-7 text-xs border-slate-300 w-24 flex-shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["Physical", "Special", "Status"].map((cat) => (
                                <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <button
                            onClick={() => toggleMoveCrit(moveKey, moveIdx)}
                            className={`h-7 px-2 text-xs font-bold rounded border transition-colors cursor-pointer flex-shrink-0 ${isCrit ? "bg-yellow-400 text-black border-yellow-500" : "bg-muted text-muted-foreground border-slate-300 hover:bg-yellow-100"}`}
                          >
                            Crit
                          </button>

                          <button
                            onClick={() => toggleMoveZ(moveKey, moveIdx)}
                            className={`h-7 px-2 text-xs font-bold rounded border transition-colors cursor-pointer flex-shrink-0 ${isZ ? "bg-purple-500 text-white border-purple-600" : "bg-muted text-muted-foreground border-slate-300 hover:bg-purple-100"}`}
                          >
                            Z
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            <div className="grid grid-cols-3">
              
              {/* Rest of the Boolean Hazards */}
              {[
                { id: "reflect", label: "REFLECT" },
                { id: "lightScreen", label: "LIGHT SCREEN" },
                { id: "auroraVeil", label: "AURORA VEIL"}, 
                

                { id: "leechSeed", label: "LEECH SEED"}, 
                { id: "tailWind", label: "TAILWIND"}, 
                { id: "protect", label: "PROTECT"}, 
                { id: "switchingOut", label: "SWITCHING OUT"},

                // DOUBLES
                { id: "helpingHand", label: "HELPING HAND"}, 
                { id: "flowerGift", label: "FLOWER GIFT"}, 
                { id: "friendGuard", label: "FRIEND GUARD"}, 
                  

              ].map((h) => (
                <button
                  key={h.id}
                  onClick={() => toggleHazard(player as 1 | 2, h.id)}
                  className={`bg-gray-400 h-8 text-sm font-bold cursor-pointer transition-colors ${hazards[h.id as keyof typeof hazards] ? "bg-gray-700 text-white" : "text-white hover:bg-white hover:text-gray-400"}`}
                >
                  {h.label}
                </button>
              ))}
            </div>

          </CardContent>
        </div>
      </Card>
    )
  }

  const TurnView = ({ turn }: { turn: TurnData }) => {
    const p1Pokemon = { ...player1Bench[0]!, currentHp: turn.player1Hp }
    const p2Pokemon = { ...player2Bench[0]!, currentHp: turn.player2Hp }

    return (
      <div className="space-y-4">
        <div className="text-center">
          <Badge variant="secondary" className="text-lg px-4 py-2 bg-primary text-primary-foreground">
            Turn {turn.turnNumber}
          </Badge>
          <p className="text-sm text-muted-foreground mt-2">{turn.action}</p>
        </div>
      </div>
    )
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
          status: "Healthy",
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
          ? { ...original, currentHp: original.maxHp, status: "Healthy" }
          : { ...pokemon, currentHp: pokemon.maxHp, status: "Healthy", statBoosts: { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 } };
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

  const player1Active = player1Bench[0]
  const player2Active = player2Bench[0]

  const currentBoxPokemon = p1Boxes[activeBoxIndex] ?
   (Object.values(p1Boxes[activeBoxIndex]).filter(p => p && 'id' in p) as Pokemon[])
    : [];

  const [activeEffects, setActiveEffects] = useState<string[]>([]); 
  const toggleEffect = (effect: string) => {
    setActiveEffects((prev) => 
      prev.includes(effect) ? prev.filter((e) => e !== effect)
    : [...prev, effect]
    ) 
  }

  const [playerStatuses, setPlayerStatuses] = useState({
  p1: [] as string[],
  p2: [] as string[]
});

const togglePlayerStatus = (player: 1 | 2, status: string) => {
  const key = player === 1 ? 'p1' : 'p2';
  setPlayerStatuses(prev => ({
    ...prev,
    [key]: prev[key].includes(status)
      ? prev[key].filter(s => s !== status)
      : [...prev[key], status]
  }));
};

  return (
    <div className="flex h-screen">
      <aside
        className={`fixed top-0 left-0 h-full bg-card border-r border-border transition-transform duration-300 z-50 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } w-80`}
      >
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Tools</h2>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              ✕
            </Button>
          </div>

          <div className="flex gap-2 mb-4">
            <Button
              variant={sidebarView === "import" ? "default" : "outline"}
              size="sm"
              onClick={() => setSidebarView("import")}
              className="flex-1"
            >
              Import/Export
            </Button>
            <Button
              variant={sidebarView === "notes" ? "default" : "outline"}
              size="sm"
              onClick={() => setSidebarView("notes")}
              className="flex-1"
            >
              Notes
            </Button>
          </div>

          <div className="flex-1 overflow-auto">
            {sidebarView === "import" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Box Management</Label>
                  <Button
                    onClick={() => {
                      if(window.confirm(`Are you sure you want to clear Box ${activeBoxIndex + 1}? This cannot be undone.`)) {
                        updateActiveBox({}); // Clears only the currently selected box
                      }
                    }}
                    variant="destructive"
                    className="w-full"
                  >
                    Clear Box {activeBoxIndex + 1}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Import Pokemon Data</Label>
                  <Textarea
                    placeholder="Paste Pokemon data here..."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="min-h-[150px]"
                  />
                  
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Export Current State</Label>
                  <Button onClick={handleExport} variant="secondary" className="w-full mb-2">
                    Generate Export
                  </Button>
                  <Textarea
                    placeholder="Export data will appear here..."
                    value={exportText}
                    readOnly
                    className="min-h-[150px]"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Battle Notes</Label>
                <Textarea
                  placeholder="Type your battle notes here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[400px]"
                />
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-4 space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setSidebarOpen(true)}>
              ☰ Tools
            </Button>
            <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Pokemon Battle Simulator
            </h1>
            <div className="w-20" />
          </div>

          <div className="flex justify-center mb-6">
            <Tabs value={battleMode} onValueChange={(v)  => setBattleMode(v as "singles" | "doubles")}>
              <TabsList className="grid w-64 grid-cols-2">
                <TabsTrigger value="singles">Singles</TabsTrigger>
                <TabsTrigger value="doubles">Doubles</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Turn History</CardTitle>
              <Button
                onClick={() => healTeam()}
                variant="outline"
                className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
              >
                Heal All Pokemon
              </Button>
              <Button onClick={handleAddTurn} variant="default">
                Add Turn
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs value={currentTurn.toString()} onValueChange={(v) => setCurrentTurn(Number.parseInt(v))}>
                <TabsList className="flex w-full">
                  {turns.map((turn) => (
                    <TabsTrigger
                      key={turn.turnNumber}
                      value={turn.turnNumber.toString()}
                      className="flex-1 min-w-0 cursor-pointer hover:bg-white hover:text-black"
                    >
                      Turn {turn.turnNumber}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {turns.map((turn) => (
                  <TabsContent key={turn.turnNumber} value={turn.turnNumber.toString()}>
                    <TurnView turn={turn} />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex flex-row items-start justify-center w-full flex-nowrap">
            <Card>
              <CardHeader>
                <CardTitle className="text-secondary">Player 1 Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Player 1 Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <select 
                      className="bg-white-800 p-2 rounded border border-secondary text-xl font-bold flex-grow"
                      value={p1SelectedTeamIndex}
                      onChange={(e) => handleTeamChange(1, e.target.value)}
                    >
                      <option value="">Select a Team</option>
                      {Object.keys(p1Teams).map((teamName, i) => (
                        <option key={teamName} value={teamName}>{teamName}</option>
                      ))}
                    </select>
                    <button onClick={saveCurrentTeam} className="p-2 bg-blue-600 rounded hover:bg-blue-500" title="Save Team">
                      <Save size={20} />
                    </button>
                    <button onClick={deleteP1Team} className="p-2 bg-red-600 rounded hover:bg-red-500" title="Clear Team">
                      <Trash2 size={20} />
                    </button>
                  </div>
                  {/* Render Player 1 Bench here using player1Bench state */}
                </div>
                <div className="flex  flex-col border-3 border-secondary/30 rounded-lg p-2 min-h-[200px] bg-secondary/5 w-[630px]">
                  <p className="text-xs text-muted-foreground mb-2">Active Pokemon (First Bench Slot)</p>
                  {activeIndices.map((idx) => renderPokemonCard(player1Bench[idx], 1, idx, battleMode))}
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
                          {pokemon && pokemon.item.name === "Mega Stone" && (
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
                                {pokemon && pokemon.status !== "Healthy" && (
                                  <div className="inset-0 flex items-center justify-center pointer-events-none z-20 rounded-lg">
                                    <div className={`w-full mb-2 py-1 text-center font-black text-[10px] uppercase shadow-md border-y border-black/10 opacity-95 ${getStatusStyle(pokemon.status)}`}>
                                      {pokemon.status}
                                    </div>
                                  </div>
                                )}
                                <p className="text-xs font-semibold truncate">{pokemon.name}</p>
                                <p className="text-xs text-muted-foreground">Lv.{pokemon.level}</p>
                                <Badge variant="outline" className="text-xs mt-1 mr-3">
                                  {pokemon.ability.name}
                                </Badge>
                                <span className="flex flex-row gap-2 justify-center">
                                  <Badge variant="outline" className="text-xs mt-1 mr-3">
                                    <img className="h-6 w-6" src={ITEM_SPRITE(pokemon.item.name)}></img>
                                    {pokemon.item.name}
                                  </Badge>
                                </span>
                                
                                {pokemon.status !== "Healthy" && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block ${getStatusStyle(pokemon.status)}`}>
                                    {pokemon.status}
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
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
                    <button onClick={() => navigateP2Teams('prev')} className="p-2 rounded hover:bg-primary/20 transition-colors cursor-pointer"><ChevronLeft /></button>                    <select 
                      className="p-2 rounded border border-primary text-xl font-bold flex-grow"
                      value={p2SelectedTeamIndex}
                      onChange={(e) => handleTeamChange(2, e.target.value)}
                    >
                      {Object.keys(p2Teams).map((teamName) => (
                        <option key={teamName} value={teamName}>{teamName}</option>
                      ))}
                    </select>
                    <button onClick={() => navigateP2Teams('next')} className="p-2 rounded hover:bg-primary/20 transition-colors cursor-pointer"><ChevronRight /></button>
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
                  {activeIndices.map((idx) => renderPokemonCard(player2Bench[idx], 2, idx, battleMode))}
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
                          {pokemon && pokemon.item.name === "Mega Stone" && (
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
                                {pokemon && pokemon.status !== "Healthy" && (
                                  <div className="inset-0 flex items-center justify-center pointer-events-none z-20 rounded-lg">
                                    <div className={`w-full mb-2 py-1 text-center font-black text-[10px] uppercase shadow-md border-y border-black/10 opacity-95 ${getStatusStyle(pokemon.status)}`}>
                                      {pokemon.status}
                                    </div>
                                  </div>
                                )}
                                <p className="text-xs font-semibold truncate">{pokemon.name}</p>
                                <p className="text-xs text-muted-foreground">Lv.{pokemon.level}</p>
                                <Badge variant="outline" className="text-xs mt-1 mr-3">
                                    {pokemon.ability.name}
                                  </Badge>
                                <span className="flex flex-row gap-2 justify-center">
                                  <Badge variant="outline" className="text-xs mt-1 mr-3">
                                    <img className="w-6 h-6" src={ITEM_SPRITE(pokemon.item.name)}></img>
                                    {pokemon.item.name}
                                  </Badge>
                                </span>
                                {pokemon.status !== "Healthy" && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block ${getStatusStyle(pokemon.status)}`}>
                                    {pokemon.status}
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
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

                  <button onClick={addBox} className="w-30 h-10 p-2 bg-[#4E9152] rounded hover:bg-green-600">
                    <div className="flex items-center gap-2 flex-row">
                      <p>Add Box</p>
                      <Plus size={20} />
                    </div>
                  </button>

                  <button onClick={clearBox} className="w-30 h-10 p-2 bg-[#FADA5E] rounded hover:bg-[#BA8E23]">
                    <div className="flex items-center gap-2 flex-row">
                      <p>Clear Box</p>
                      <Trash2 size={20} />
                    </div>
                  </button>

                  <button onClick={removeBox} className="w-35 h-10 p-2 bg-[#FF746C] rounded hover:bg-red-500">
                    <div className="flex items-center gap-2 flex-row">
                      <p>Delete Box</p>
                      <X/>
                    </div>
                  </button>

                  <button
                    onClick={() => setImportModalOpen(true)}
                    className="w-35 h-15 p-2 bg-[#6A9BD8] text-white rounded hover:bg-blue-500"
                  >
                    <div className="flex h-10 items-center gap-2 flex-row">
                      <p>Import Pokemon</p>
                      <Plus size={20} />
                    </div>
                  </button>

                  <button
                    onClick={() => setRemoveMode(prev => !prev)}
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
              key={pokemon.ID}
              className={`flex flex-col items-center gap-1 ${removeMode ? "cursor-pointer opacity-80 hover:opacity-50 hover:ring-2 hover:ring-red-500 rounded-lg" : ""}`}
              onClick={async () => {
                if (!removeMode) return;
                if (!window.confirm(`Remove ${pokemon.name} from this box?`)) return;
                try {
                  const res = await fetch(`http://localhost:3500/myBoxes/${boxIndex}/${pokemon.name}`, { method: "DELETE" });
                  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
                  const json = await res.json();
                  const resolvedBoxes = await resolveBoxes(json.allBoxes);
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
                    className="text-xs px-2 py-1 rounded-full text-white font-medium"
                    style={{ backgroundColor: getTypeColor(type) }}
                  >
                    {type.name}
                  </div>
                ))}
              </div>
              
              <Button
                size="sm"
                variant={isInBench(pokemon, 1) ? "destructive" : "default"}
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

    {importModalOpen && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background border rounded-lg p-6 w-[500px] flex flex-col gap-4 shadow-xl">
          <h2 className="text-lg font-semibold">Import Pokemon</h2>
          <p className="text-sm text-muted-foreground">
            Paste your import text below. You can import multiple Pokemon at once.
          </p>
          <Textarea
            value={importModalText}
            onChange={(e) => setImportModalText(e.target.value)}
            placeholder="Paste Pokemon import text here..."
            className="min-h-[200px] max-h-[300px] overflow-y-auto resize-none font-mono text-sm"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setImportModalOpen(false); setImportModalText(""); }}
              className="px-4 py-2 rounded bg-muted hover:bg-muted/80"
            >
              Cancel
            </button>
            <button
              onClick={handleImportModal}
              className="px-4 py-2 rounded bg-[#4E9152] hover:bg-green-600 text-white"
            >
              Import
            </button>
          </div>
        </div>
      </div>
    )}

    </div>
  )
}