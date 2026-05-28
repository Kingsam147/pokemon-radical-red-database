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
  Teams, 
  Box, 
  TurnData, createPokemon} from "@/lib/utils/types.ts";

  import {POKEMON_SPRITES} from "@/lib/utils/sprites.ts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

  async function fetchMyBoxes() {
  const res = await fetch(`${API_BASE}/myBoxes`, {
    method: "GET"
  });

  if (!res.ok) throw new Error (`Request failed: ${res.status}`);

  return res.json()
}

export async function fetchAddBox() {
  const res = await fetch(`${API_BASE}/myBoxes`, {
    method: "POST"
  });

  if (!res.ok) throw new Error (`Request failed: ${res.status}`);

  return res.json()
}

export async function fetchRemoveBox(index: string) {
  const res = await fetch(`${API_BASE}/myBoxes/${index}`, {
    method: "DELETE"
  });

  if (!res.ok) throw new Error (`Request failed: ${res.status}`);

  return res.json()
}

export async function fetchClearBox(index: string) {
  const res = await fetch(`${API_BASE}/myBoxes/${index}`, {
    method: "PUT"
  });
  if (!res.ok) throw new Error (`Request failed: ${res.status}`); 
  return res.json();
}

async function fetchAddToBox(boxIndex: string, payload: pokemonPayload) {
  const res = await fetch(`${API_BASE}/myBoxes/${boxIndex}`, {
    method: "POST", 
    headers: {
      "Content-Type": "application/json"
    }, 
    body: JSON.stringify(payload)});

    if (!res.ok) throw new Error (`Request failed: ${res.status}`);

    return res.json();
}

export async function addPokemon(boxIndex: string, pokemonData: string) {
  const newPokemonJSON = await fetchAddToBox(boxIndex, { pokemonData });
  return {
    addPokemon: newPokemonJSON.addedPokemon,
    updatedBox: newPokemonJSON.allBoxes
  }
}

export async function loadMyBoxes(abilityList: Abilities, itemsList: Items, naturesList: Natures, movesList: PokemonMoves, typeList: PokemonTypes) {
        
  const myBoxesJSON = await fetchMyBoxes();
  const loadedBoxes: Box[] = myBoxesJSON.allBoxes
  
  const myBoxes = loadedBoxes.map(box => {
    const newBox: Box = {};
    for (const [key, pokemon] of Object.entries(box)) {
    
      if (!pokemon) continue;
      const resolvedItem = typeof pokemon.item === 'string' ? itemsList[pokemon.item] : pokemon.item;
      const resolvedAbility = typeof pokemon.ability === 'string' ? abilityList[pokemon.ability] : pokemon.ability;
      resolvedAbility
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
        form.sprite = POKEMON_SPRITES(String(form.ID));
      }
      
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
    return newBox;
  });
  return myBoxes;
}

export function resolveBoxes(
    rawBoxes: any[], 
    abilityList: Record<string, any>,
    itemsList: Record<string, any>, 
    movesList: Record<string, any>, 
    naturesList: Record<string, any>, 
    typeList: Record<string, any>, 
): Box[] {
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