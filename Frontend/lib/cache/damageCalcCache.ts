import { DamageResult } from "@/lib/utils/types.ts";
import { DamageCalcPayload } from "@/lib/api/misc.ts";

// In-memory (not localStorage): results depend on transient battle-field
// state (hazards/weather/toggles) with no value surviving a reload, so a
// plain session-lifetime Map avoids unbounded storage growth across sessions.
const cache = new Map<string, DamageResult>();

export const buildCalcCacheKey = (payload: DamageCalcPayload): string => JSON.stringify(payload);

export const getCachedDamageCalc = (cacheKey: string): DamageResult | undefined => cache.get(cacheKey);

export const setCachedDamageCalc = (cacheKey: string, result: DamageResult): void => {
  cache.set(cacheKey, result);
};
