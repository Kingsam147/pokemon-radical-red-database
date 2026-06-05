import apiClient from "@/lib/infrastructure/apiClient";

export async function activateSession(
  sessionId: string,
  player: number,
  teamName: string,
  pokemonName: string
) {
  const res = await apiClient.post('/api/pokemon/activate', {
    sessionId,
    player,
    teamName,
    pokemonName,
  });
  return res.data as { message: string; pokemon: unknown };
}

export async function patchSession(sessionId: string, changes: Record<string, unknown>) {
  const res = await apiClient.patch(`/api/pokemon/draft/${sessionId}`, changes);
  return res.data;
}

export async function saveSession(sessionId: string, teamName: string, pokemonName: string) {
  const res = await apiClient.post(`/api/pokemon/save/${sessionId}`, { teamName, pokemonName });
  return res.data as { message: string };
}
