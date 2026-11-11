import React from "react";
import { Pokemon, DamageResult } from "@/lib/utils/types";
import { Hazards } from "@/lib/hooks/useBattleField";
import { postDamageCalc, fetchCalculateDamageBatch, buildDamageCalcPayload, DamageCalcPayload } from "@/lib/api/misc"
import { getCachedDamageCalc, setCachedDamageCalc, buildCalcCacheKey } from "@/lib/cache/damageCalcCache"

const buildField = (player: number, p1Hazards: Hazards, p2Hazards: Hazards, activeEffects: string[], battleMode: "singles" | "doubles") => {
    const weather = activeEffects.find(e => ["Sun", "Rain", "Sand", "Snow", "Harsh Sunshine", "Heavy Rain", "Strong Winds"].includes(e));
    const terrainEffect = activeEffects.find(e => ["Electric Terrain", "Grassy Terrain", "Misty Terrain", "Psychic Terrain"].includes(e));
    const terrain = terrainEffect?.replace(" Terrain", "");
    const attackerHazards = player === 1 ? p1Hazards : p2Hazards;
    const defenderHazards = player === 1 ? p2Hazards : p1Hazards;
    return {
        gameType: battleMode === "doubles" ? "Doubles" : "Singles",
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
            isFriendGuard: defenderHazards.friendGuard,
            spikes: defenderHazards.spikes,
            isSR: defenderHazards.sRock,
            isStickyWeb: defenderHazards.stickyWebs,
        }
    };
};

interface CalcCandidate {
  resultKey: string;
  cacheKey: string;
  payload: DamageCalcPayload;
}

// Bench index of the Pokemon an attacker's moves are calculated against, or -1 if none.
// Doubles: the chosen enemy active slot (0 or 1), falling back to the other active slot
// when the chosen one is empty. Singles: the first occupied enemy slot, as before.
export const resolveDefenderSlot = (
  defenderBench: (Pokemon | null)[],
  battleMode: "singles" | "doubles",
  targetSlot: number,
): number => {
  if (battleMode === "singles") return defenderBench.findIndex(p => p !== null);
  if (defenderBench[targetSlot]) return targetSlot;
  const otherActiveSlot = targetSlot === 0 ? 1 : 0;
  return defenderBench[otherActiveSlot] ? otherActiveSlot : -1;
};

const buildCalcCandidate = (
  player: 1 | 2,
  slotIndex: number,
  idx: number,
  pokemon: Pokemon,
  targetSlot: number,
  player1Bench: (Pokemon | null)[],
  player2Bench: (Pokemon | null)[],
  p1Hazards: Hazards,
  p2Hazards: Hazards,
  activeEffects: string[],
  battleMode: "singles" | "doubles",
  abilityToggles: Record<string, boolean>,
  moveCrits: Record<string, boolean[]>,
  moveZPowered: Record<string, boolean[]>,
): CalcCandidate | null => {
  const defenderBench = player === 1 ? player2Bench : player1Bench;
  const defenderIdx = resolveDefenderSlot(defenderBench, battleMode, targetSlot);
  const defender = defenderBench[defenderIdx] ?? null;
  if (!defender || !pokemon.moveset[idx] || pokemon.moveset[idx].name === "None") return null;

  const moveKey = `p${player}-${slotIndex}`;
  const isCrit = moveCrits[moveKey]?.[idx] ?? false;
  const isZ = moveZPowered[moveKey]?.[idx] ?? false;
  const resultKey = `p${player}-${slotIndex}-move${idx}`;

  const payload = buildDamageCalcPayload(
    pokemon, player, slotIndex,
    defender, player === 1 ? 2 : 1, defenderIdx,
    { ...pokemon.moveset[idx], isCrit, isZ },
    buildField(player, p1Hazards, p2Hazards, activeEffects, battleMode),
    abilityToggles
  );

  return { resultKey, cacheKey: buildCalcCacheKey(payload), payload };
};

export const runCalc = async (
  player: 1 | 2,
  slotIndex: number,
  idx: number,
  pokemon: Pokemon,
  targetSlot: number,
  player1Bench: (Pokemon | null)[],
  player2Bench: (Pokemon | null)[],
  p1Hazards: Hazards,
  p2Hazards: Hazards,
  activeEffects: string[],
  battleMode: "singles" | "doubles",
  abilityToggles: Record<string, boolean>,
  moveCrits: Record<string, boolean[]>,
  moveZPowered: Record<string, boolean[]>,
  setDamageResults: React.Dispatch<React.SetStateAction<Record<string, DamageResult | null>>>,
  setCalcLoadingKeys?: React.Dispatch<React.SetStateAction<Set<string>>>
) => {
  const candidate = buildCalcCandidate(
    player, slotIndex, idx, pokemon, targetSlot, player1Bench, player2Bench,
    p1Hazards, p2Hazards, activeEffects, battleMode,
    abilityToggles, moveCrits, moveZPowered
  );
  if (!candidate) return;
  const { resultKey, cacheKey, payload } = candidate;

  const cached = getCachedDamageCalc(cacheKey);
  if (cached) {
    setDamageResults(prev => ({ ...prev, [resultKey]: cached }));
    return;
  }

  setCalcLoadingKeys?.(prev => new Set(prev).add(resultKey));

  try {
    const res = await postDamageCalc(payload);
    setCachedDamageCalc(cacheKey, res.calculation);
    setDamageResults(prev => ({ ...prev, [resultKey]: res.calculation }));
  } catch {
    // Calc failures are non-fatal — the move button stays at "—"
  } finally {
    setCalcLoadingKeys?.(prev => {
      const next = new Set(prev);
      next.delete(resultKey);
      return next;
    });
  }
};

export const runAllCalcs = async (
  player: 1 | 2,
  slotIndex: number,
  pokemon: Pokemon,
  targetSlot: number,
  player1Bench: (Pokemon | null)[],
  player2Bench: (Pokemon | null)[],
  p1Hazards: Hazards,
  p2Hazards: Hazards,
  activeEffects: string[],
  battleMode: "singles" | "doubles",
  abilityToggles: Record<string, boolean>,
  moveCrits: Record<string, boolean[]>,
  moveZPowered: Record<string, boolean[]>,
  setDamageResults: React.Dispatch<React.SetStateAction<Record<string, DamageResult | null>>>,
  setCalcLoadingKeys?: React.Dispatch<React.SetStateAction<Set<string>>>
) => {
  const candidates: CalcCandidate[] = [];
  for (let idx = 0; idx < pokemon.moveset.length; idx++) {
    const candidate = buildCalcCandidate(
      player, slotIndex, idx, pokemon, targetSlot, player1Bench, player2Bench,
      p1Hazards, p2Hazards, activeEffects, battleMode, abilityToggles, moveCrits, moveZPowered
    );
    if (candidate) candidates.push(candidate);
  }

  const cacheHits: { resultKey: string, result: DamageResult }[] = [];
  const cacheMisses: CalcCandidate[] = [];
  for (const candidate of candidates) {
    const cached = getCachedDamageCalc(candidate.cacheKey);
    if (cached) {
      cacheHits.push({ resultKey: candidate.resultKey, result: cached });
    } else {
      cacheMisses.push(candidate);
    }
  }

  if (cacheHits.length > 0) {
    setDamageResults(prev => {
      const next = { ...prev };
      for (const hit of cacheHits) next[hit.resultKey] = hit.result;
      return next;
    });
  }

  if (cacheMisses.length === 0) return;

  setCalcLoadingKeys?.(prev => {
    const next = new Set(prev);
    for (const miss of cacheMisses) next.add(miss.resultKey);
    return next;
  });

  try {
    const results = await fetchCalculateDamageBatch(
      cacheMisses.map(miss => ({ key: miss.resultKey, payload: miss.payload }))
    );

    const resultByKey = new Map(results.map(result => [result.key, result]));
    setDamageResults(prev => {
      const next = { ...prev };
      for (const miss of cacheMisses) {
        const result = resultByKey.get(miss.resultKey);
        if (result?.calculation) {
          setCachedDamageCalc(miss.cacheKey, result.calculation);
          next[miss.resultKey] = result.calculation;
        }
      }
      return next;
    });
  } catch {
    // Calc failures are non-fatal — the affected move buttons stay at "—"
  } finally {
    setCalcLoadingKeys?.(prev => {
      const next = new Set(prev);
      for (const miss of cacheMisses) next.delete(miss.resultKey);
      return next;
    });
  }
};
