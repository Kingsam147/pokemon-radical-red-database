import { Pokemon } from "@/lib/utils/types.ts"

export function isUnsavedP1Selection(
  selectedTeamIndex: string,
  p1Teams: Record<string, (Pokemon | null)[]>
): boolean {
  return !selectedTeamIndex || !p1Teams[selectedTeamIndex]
}
