import { useState } from "react"
import { Pokemon, Teams } from "@/lib/utils/types.ts"

export function useTeamManager() {
  const [p1Teams, setP1Teams] = useState<Record<string, (Pokemon | null)[]>>({})
  const [p2Teams, setP2Teams] = useState<Teams>({})
  const [p2OriginalTeams, setP2OriginalTeams] = useState<Teams>({})
  const [p1SelectedTeamIndex, setP1SelectedTeamIndex] = useState<string>("")
  const [p2SelectedTeamIndex, setP2SelectedTeamIndex] = useState<string>("")

  return {
    p1Teams, setP1Teams,
    p2Teams, setP2Teams,
    p2OriginalTeams, setP2OriginalTeams,
    p1SelectedTeamIndex, setP1SelectedTeamIndex,
    p2SelectedTeamIndex, setP2SelectedTeamIndex,
  }
}
