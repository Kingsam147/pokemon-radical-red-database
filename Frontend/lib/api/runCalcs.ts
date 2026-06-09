import React from "react";
import { Pokemon } from "@/lib/utils/types";
import { fetchCalculateDamage } from "@/lib/api/misc"

const buildField = (player: number, p1Hazards: any, p2Hazards: any, activeEffects: string[]) => {
    const weather = activeEffects.find(e => ["Sun", "Rain", "Sand", "Snow", "Harsh Sunshine", "Heavy Rain", "Strong Winds"].includes(e));
    const terrain = activeEffects.find(e => ["Electric Terrain", "Grassy Terrain", "Misty Terrain", "Psychic Terrain"].includes(e));
    const attackerHazards = player === 1 ? p1Hazards : p2Hazards;
    const defenderHazards = player === 1 ? p2Hazards : p1Hazards;
    return {
        weather,
        terrain,
        isMagicRoom: activeEffects.includes("Magic Room"),
        isWonderRoom: activeEffects.includes("Wonder Room"),
        isGravity: activeEffects.includes("Gravity"),
        attackerSide: {
            isReflect: attackerHazards.reflect,
            isLightScreen: attackerHazards.lightScreen,
            isAuroraVeil: attackerHazards.auroraVeil,
            isTailwind: attackerHazards.tailWind,
            isHelpingHand: attackerHazards.helpingHand,
            isFlowerGift: attackerHazards.flowerGift,
            isFriendGuard: attackerHazards.friendGuard,
        },
        defenderSide: {
            isReflect: defenderHazards.reflect,
            isLightScreen: defenderHazards.lightScreen,
            isAuroraVeil: defenderHazards.auroraVeil,
            isTailwind: defenderHazards.tailWind,
            spikes: defenderHazards.spikes,
            isSR: defenderHazards.sRock,
            isStickyWeb: defenderHazards.stickyWebs,
        }
    };
};

export const runCalc = async (
  player: 1 | 2,
  slotIndex: number,
  idx: number,
  pokemon: Pokemon,
  player1Bench: (Pokemon | null)[],
  player2Bench: (Pokemon | null)[],
  p1Hazards: any,
  p2Hazards: any,
  activeEffects: string[],
  abilityToggles: Record<string, boolean>,
  moveCrits: Record<string, boolean[]>,
  moveZPowered: Record<string, boolean[]>,
  setDamageResults: React.Dispatch<React.SetStateAction<Record<string, any>>>,
  setCalcLoadingKeys?: React.Dispatch<React.SetStateAction<Set<string>>>
) => {
  const defenderBench = player === 1 ? player2Bench : player1Bench;
  const defenderIdx = defenderBench.findIndex(p => p !== null);
  const defender = defenderBench[defenderIdx] ?? null;
  if (!defender || !pokemon.moveset[idx] || pokemon.moveset[idx].name === "None") return;

  const moveKey = `p${player}-${slotIndex}`;
  const isCrit = moveCrits[moveKey]?.[idx] ?? false;
  const isZ = moveZPowered[moveKey]?.[idx] ?? false;
  const key = `p${player}-${slotIndex}-move${idx}`;

  setCalcLoadingKeys?.(prev => new Set(prev).add(key));

  try {
    const res = await fetchCalculateDamage(
      pokemon, player, slotIndex,
      defender, player === 1 ? 2 : 1, defenderIdx,
      { ...pokemon.moveset[idx], isCrit, isZ },
      buildField(player, p1Hazards, p2Hazards, activeEffects),
      abilityToggles
    );
    setDamageResults(prev => ({ ...prev, [key]: res.calculation }));
  } catch {
    // Calc failures are non-fatal — the move button stays at "—"
  } finally {
    setCalcLoadingKeys?.(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }
};

export const runAllCalcs = async (
  player1Bench: (Pokemon | null)[],
  player2Bench: (Pokemon | null)[],
  p1Hazards: any,
  p2Hazards: any,
  activeEffects: string[],
  abilityToggles: Record<string, boolean>,
  moveCrits: Record<string, boolean[]>,
  moveZPowered: Record<string, boolean[]>,
  setDamageResults: React.Dispatch<React.SetStateAction<Record<string, any>>>,
  setCalcLoadingKeys?: React.Dispatch<React.SetStateAction<Set<string>>>
) => {
  const p1 = player1Bench[0];
  const p2 = player2Bench[0];
  if (!p1 || !p2) return;

  const args = [player1Bench, player2Bench, p1Hazards, p2Hazards, activeEffects, abilityToggles, moveCrits, moveZPowered, setDamageResults, setCalcLoadingKeys] as const;

  for (let idx = 0; idx < p1.moveset.length; idx++) {
    await runCalc(1, 0, idx, p1, ...args);
  }
  for (let idx = 0; idx < p2.moveset.length; idx++) {
    await runCalc(2, 0, idx, p2, ...args);
  }
};