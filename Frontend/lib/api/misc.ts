import { Pokemon, PokemonStats, PokemonMove, Nature, DamageResult } from "@/lib/utils/types.ts";
import { formatPokemonForAPI } from "@/lib/utils/formatters.ts";

// fetches from backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

interface CalcStatsPayload {
  pokemonData: {
    baseStats: PokemonStats
    EVs: PokemonStats
    IVs: PokemonStats
    nature: Nature
    level: number
    statBoosts?: Partial<PokemonStats>
  }
}

async function fetchCalcStats(payload: CalcStatsPayload) {
  const res = await fetch(`${API_BASE}/misc/stats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function fetchItemsData() {
  const res = await fetch(`${API_BASE}/misc/items`, {
    method: "GET"}); 

    if (!res.ok) throw new Error (`Request failed: ${res.status}`);

    return res.json();
}

async function fetchAbilityData() {
  const res = await fetch(`${API_BASE}/misc/abilities`, {
    method: "GET"
  })

  if (!res.ok) throw new Error (`Request failed: ${res.status}`)

  return res.json()
}

async function fetchNaturesData() {
  const res = await fetch(`${API_BASE}/misc/natures`, {
    method: "GET"}); 

    if (!res.ok) throw new Error (`Request failed: ${res.status}`);

    return res.json();
}

async function fetchMovesData() {
  const res = await fetch(`${API_BASE}/misc/moves`, {
    method: "GET"}); 

    if (!res.ok) throw new Error (`Request failed: ${res.status}`); 

    return res.json();
}

export async function fetchTypesData() {
  const res = await fetch(`${API_BASE}/misc/types`, {
    method: "GET"}); 

    if (!res.ok) throw new Error (`Request failed: ${res.status}`);

    return res.json();
}

async function fetchStatuses() {
  const res = await fetch(`${API_BASE}/misc/statuses`, {
    method: "GET"});

    if (!res.ok) throw new Error (`Request failed: ${res.status}`); 

    return res.json();
}

export async function fetchTypeInteractions(type1: string, type2: string) {
  const res = await fetch(`${API_BASE}/misc/calcTypes/${type1}/${type2}`, {
    method: "GET"}); 

    if (!res.ok) throw new Error (`Request failed: ${res.status}`);

    return res.json();
}

export interface DamageCalcPayload {
  attacker: ReturnType<typeof formatPokemonForAPI>;
  defender: ReturnType<typeof formatPokemonForAPI>;
  move: PokemonMove;
  field: { weather?: string, terrain?: string };
  abilityToggles: Record<string, boolean>;
}

export function buildDamageCalcPayload(
  attacker: Pokemon,
  attackerPlayer: number,
  attackerSlot: number,
  defender: Pokemon,
  defenderPlayer: number,
  defenderSlot: number,
  move: PokemonMove,
  field: { weather?: string, terrain?: string },
  abilityToggles: Record<string, boolean>
): DamageCalcPayload {
    const attackerKey = `p${attackerPlayer}-${attackerSlot}`;
    const defenderKey = `p${defenderPlayer}-${defenderSlot}`;

    // Merge attacker and defender toggles
    const mergedToggles = {
      [attackerKey]: attackerKey in abilityToggles ? abilityToggles[attackerKey] : (attacker.ability?.toggledOn ?? false),
      [defenderKey]: defenderKey in abilityToggles ? abilityToggles[defenderKey] : (defender.ability?.toggledOn ?? false),
    };

    return {
      attacker: formatPokemonForAPI(attacker),
      defender: formatPokemonForAPI(defender),
      move: {
        ...move,
        isCrit: move.isCrit ?? false,
        isZ: move.isZ ?? false,
      },
      field: field,
      abilityToggles: mergedToggles
    };
}

export async function postDamageCalc(payload: DamageCalcPayload) {
    try {
      const res = await fetch(`${API_BASE}/misc/damage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      return res.json();
    } catch (err) {
      console.error("Failed to calculate damage:", err);
      throw err;
    }
}

export async function fetchCalculateDamage(
  attacker: Pokemon,
  attackerPlayer: number,
  attackerSlot: number,
  defender: Pokemon,
  defenderPlayer: number,
  defenderSlot: number,
  move: PokemonMove,
  field: { weather?: string, terrain?: string },
  abilityToggles: Record<string, boolean>
) {
    const payload = buildDamageCalcPayload(
      attacker, attackerPlayer, attackerSlot,
      defender, defenderPlayer, defenderSlot,
      move, field, abilityToggles
    );
    return postDamageCalc(payload);
}

export interface DamageCalcBatchItem {
  key: string;
  payload: DamageCalcPayload;
}

export interface DamageCalcBatchResult {
  key: string;
  calculation?: DamageResult;
  error?: string;
}

export async function fetchCalculateDamageBatch(items: DamageCalcBatchItem[]): Promise<DamageCalcBatchResult[]> {
    try {
      const res = await fetch(`${API_BASE}/misc/damage/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calculations: items.map(item => ({ key: item.key, ...item.payload }))
        })
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json = await res.json();
      return json.results;
    } catch (err) {
      console.error("Failed to calculate damage batch:", err);
      throw err;
    }
}



// function calls

export async function calcStats(pokemon: Pokemon): Promise<PokemonStats> {
  const json = await fetchCalcStats({ pokemonData: { 
    baseStats: pokemon.baseStats,
    EVs: pokemon.EVs,
    IVs: pokemon.IVs,
    nature: pokemon.nature,
    level: pokemon.level,
    statBoosts: pokemon.statBoosts,
  } });
  return json.stats;
}

export const MOVES_OPTIONS = async () => {
  const movesListJSON = await fetchMovesData(); 
  const movesList = movesListJSON.movesData
  return movesList;
}

export const ABILITY_OPTIONS = async () => {
  const abilityListJSON = await fetchAbilityData(); 
  const abilityList = abilityListJSON.abilitiesData
  return abilityList;
}

export const ITEMS_OPTIONS = async () => {
  const itemsListJSON = await fetchItemsData(); 
  const itemsList = itemsListJSON.items
  return itemsList;
}

export const NATURE_OPTIONS = async () => {
  const natureListJSON = await fetchNaturesData(); 
  const naturesList = natureListJSON.natures;
  return naturesList;
}

export const TYPE_OPTIONS = async () => {
  const typeListJSON = await fetchTypesData(); 
  const typeList = typeListJSON.types;
  return typeList;
}

export const STATUS_OPTIONS = async () => {
  const statusListJSON = await fetchStatuses();
  const statusList = statusListJSON.statuses;
  return statusList;
}

export const MISC_VERSION = async (): Promise<string> => {
  const res = await fetch(`${API_BASE}/misc/version`, { method: 'GET' });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const json = await res.json();
  return json.version as string;
}
