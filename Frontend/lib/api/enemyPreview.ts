import axios from "axios"
import { Team, RawTeam } from "@/lib/utils/types.ts"
import { resolveEnemyTeam } from "@/lib/api/teams"
import apiClient from "@/lib/infrastructure/apiClient"

async function fetchEnemyPreview(): Promise<{
  teamName: string
  team: RawTeam
} | null> {
  try {
    const res = await apiClient.get("/public/enemy-preview")
    return res.data
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null
    throw err
  }
}

export async function loadEnemyPreview(): Promise<{
  teamName: string
  team: Team
} | null> {
  const preview = await fetchEnemyPreview()
  if (!preview) return null

  // Fields on preview.team are already fully resolved objects (hydrated server-side),
  // so the lookup lists are never actually indexed into here.
  const resolvedTeam = resolveEnemyTeam(preview.team, {}, {}, {}, {}, {})
  return { teamName: preview.teamName, team: resolvedTeam }
}
