import apiClient from "@/lib/infrastructure/apiClient"
import { PokemonMove } from "@/lib/utils/types.ts"

type GetMoveAvailabilityParams = {
  species: string
  form: string
  level: number
  checkedTMs: string[]
  tutorTier: number | null
}

// PUBLIC — no auth required: stateless movepool computation from species/level/checklist
// state, touches no user-owned data. Always computes the restricted+pre-evolution pool;
// Restricted Mode only controls whether the frontend displays this list or every move
// in the game, and whether the backend enforces it at save time — see toolSidebar/validate.js.
export async function getMoveAvailability(params: GetMoveAvailabilityParams) {
  const res = await apiClient.post("/public/move-availability", params)
  return res.data as { allMoves: PokemonMove[] }
}
