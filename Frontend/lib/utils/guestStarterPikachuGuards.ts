import { Pokemon } from "@/lib/utils/types.ts"

export function shouldSeedGuestStarterPikachu(params: {
  pikachu: Pokemon | null
  cancelled: boolean
  teamLocked: boolean
  bench: (Pokemon | null)[]
}): boolean {
  if (params.cancelled || !params.pikachu || params.teamLocked) return false
  return params.bench.every((p) => p === null)
}

export function isUnsavedP1Selection(
  selectedTeamIndex: string,
  p1Teams: Record<string, (Pokemon | null)[]>
): boolean {
  return !selectedTeamIndex || !p1Teams[selectedTeamIndex]
}
