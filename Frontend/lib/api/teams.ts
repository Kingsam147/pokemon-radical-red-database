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
  Pokemon, 
  Team,
  Teams, 
  Box, 
  TurnData, createPokemon} from "@/lib/utils/types.ts";

import { POKEMON_SPRITES } from "@/lib/utils/sprites.ts";
import apiClient from "@/lib/infrastructure/apiClient";

async function fetchAddTeam(playerId: string, payload: teamPayload) {
  const res = await apiClient.post(`/teams/${playerId}`, payload);
  return res.data;
}

async function fetchRemoveTeam(playerId: string, teamName: string) {
  const res = await apiClient.delete(`/teams/${playerId}/${teamName}`);
  return res.data;
}

export async function fetchAllTeams(playerId: string) {
  const res = await apiClient.get(`/teams/${playerId}`);
  return res.data;
}

async function fetchRemoveAllTeams(playerId: string) {
  const res = await apiClient.delete(`/teams/${playerId}`);
  return res.data;
}

export async function addTeam(playerID: string, payload: teamPayload) {
  const teamJSON = await fetchAddTeam(playerID, payload);
  return teamJSON.currentBox;
} 

export async function removeTeam(playerID: string, teamName: string) {
  const teamJSON = await fetchRemoveTeam(playerID, teamName); 
  return teamJSON.currentBox;
}

export async function removeAllTeams(playerID: string) {
  const teamsJSON = await fetchRemoveAllTeams(playerID);
  return teamsJSON.currentBox;
}

export async function loadEnemyTeams(abilityList: Abilities, itemsList: Items, naturesList: Natures, movesList: PokemonMoves, typeList: PokemonTypes) {

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
    
      const resolvedItem: Item = typeof p.item === 'string' ? itemsList[p.item] : p.item;
      const resolvedAbility: Ability = typeof p.ability === 'string' ? abilityList[p.ability] : p.ability;
      const resolvedAbilities: Ability[] = (p.abilities as any[]).map(a => typeof a === 'string' ? abilityList[a] : a);
      const resolvedNature: Nature = typeof p.nature === 'string' ? naturesList[p.nature] : p.nature;
      const resolvedType1: PokemonType = typeof p.type1 === 'string' ? (typeList[p.type1] ?? typeList[p.type1]) : p.type1;
      const resolvedType2: PokemonType = typeof p.type2 === 'string' ? (typeList[p.type2] ?? typeList[p.type2]) : p.type2;
      const resolvedForm: PokemonForm = typeof p.form === 'string' ? p.forms[p.form] : p.form;
      const resolvedStatBoosts: Partial<PokemonStats> = p.statBoosts || { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 };
      const resolvedMoves: PokemonMove[] = (p.moveset as any[]).map(m => typeof m === 'string' ? (movesList[m.toLowerCase().replaceAll(/[^a-z0-9]/g, "")] ?? { name: m }) : m);
      const resolvedAllMoves: PokemonMove[] = (p.allMoves as any[]).map(m => typeof m === 'string' ? (movesList[m.toLowerCase().replaceAll(/[^a-z0-9]/g, "")] ?? { name: m }) : m);
    
      // Resolve each form
      for (const form of Object.values(p.forms) as any[]) {
        form.ability = typeof form.ability === 'string' ? abilityList[form.ability] : form.ability;
        form.abilities = (form.abilities as any[]).map(a =>
          typeof a === 'string' ? abilityList[a] : a
        );
    
        form.allMoves = (form.allMoves as any[]).map(m => typeof m === 'string' ? (movesList[m.toLowerCase().replaceAll(/[^a-z0-9]/g, "")] ?? { name: m }) : m);
        form.type1 = typeof form.type1 === 'string' ? (typeList[form.type1] ?? typeList[p.type1]) : form.type1;
        form.type2 = typeof form.type2 === 'string' ? (typeList[form.type2] ?? typeList[p.type2]) : form.type2;
      }
    
      resolvedTeam[slotKey] = createPokemon(
        p.name,
        String(p.ID),
        POKEMON_SPRITES(p.ID), // already a full URL in the JSON
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

  return resolvedP2Teams;
}

export async function loadMyTeams(
  abilityList: Abilities,
  itemsList: Items,
  naturesList: Natures,
  movesList: PokemonMoves,
  typeList: PokemonTypes
): Promise<Record<string, (Pokemon | null)[]>> {
  const myTeamsJSON = await fetchAllTeams('1');
  const resolved: Record<string, (Pokemon | null)[]> = {};

  for (const [teamName, bench] of Object.entries(myTeamsJSON.allTeams as Record<string, any[]>)) {
    resolved[teamName] = bench.map((p: any) => {
      if (!p) return null;

      const resolvedItem: Item = typeof p.item === 'string' ? itemsList[p.item] : p.item;
      const resolvedAbility: Ability = typeof p.ability === 'string' ? abilityList[p.ability] : p.ability;
      const resolvedAbilities: Ability[] = (p.abilities as any[]).map(a => typeof a === 'string' ? abilityList[a] : a);
      const resolvedNature: Nature = typeof p.nature === 'string' ? naturesList[p.nature] : p.nature;
      const resolvedType1: PokemonType = typeof p.type1 === 'string' ? typeList[p.type1] : p.type1;
      const resolvedType2: PokemonType = typeof p.type2 === 'string' ? typeList[p.type2] : p.type2;
      const resolvedForm: PokemonForm = typeof p.form === 'string' ? p.forms[p.form] : p.form;
      const resolvedStatBoosts: Partial<PokemonStats> = p.statBoosts || { Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 };
      const resolvedMoves: PokemonMove[] = (p.moveset as any[]).map(m => typeof m === 'string' ? (movesList[m.toLowerCase().replaceAll(/[^a-z0-9]/g, '')] ?? { name: m }) : m);
      const resolvedAllMoves: PokemonMove[] = (p.allMoves as any[]).map(m => typeof m === 'string' ? (movesList[m.toLowerCase().replaceAll(/[^a-z0-9]/g, '')] ?? { name: m }) : m);

      for (const form of Object.values(p.forms) as any[]) {
        form.ability = typeof form.ability === 'string' ? abilityList[form.ability] : form.ability;
        form.abilities = (form.abilities as any[]).map(a => typeof a === 'string' ? abilityList[a] : a);
        form.allMoves = (form.allMoves as any[]).map(m => typeof m === 'string' ? (movesList[m.toLowerCase().replaceAll(/[^a-z0-9]/g, '')] ?? { name: m }) : m);
        form.type1 = typeof form.type1 === 'string' ? typeList[form.type1] : form.type1;
        form.type2 = typeof form.type2 === 'string' ? typeList[form.type2] : form.type2;
        form.types = form.type2 && form.type2.name !== 'None' ? [form.type1, form.type2] : [form.type1];
        form.sprite = POKEMON_SPRITES(String(form.ID));
      }

      return createPokemon(
        p.name, String(p.ID), POKEMON_SPRITES(p.ID),
        resolvedType1, resolvedType2, p.level, resolvedNature, resolvedItem,
        resolvedAbility, resolvedAbilities, p.baseStats, p.EVs, p.IVs,
        p.finalStats.HP, p.finalStats, resolvedMoves, resolvedAllMoves,
        resolvedForm, p.forms, p.gender, p.femaleSprite, resolvedStatBoosts
      );
    });
  }

  return resolved;
}

export async function saveFullTeam(playerID: string, teamName: string, bench: (Pokemon | null)[]) {
  const res = await apiClient.put(`/teams/${playerID}/${teamName}`, { bench });
  return res.data;
}