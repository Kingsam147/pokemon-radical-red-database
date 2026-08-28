import { Pokemon } from "@/lib/utils/types.ts"

const GUEST_PIKACHU_REMOVED_STORAGE_KEY = "rr_guest_pikachu_removed"

export function isUnsavedP1Selection(
  selectedTeamIndex: string,
  p1Teams: Record<string, (Pokemon | null)[]>
): boolean {
  return !selectedTeamIndex || !p1Teams[selectedTeamIndex]
}

export function readGuestPikachuRemoved(): boolean {
  if (typeof window === "undefined") {
    return false
  }
  try {
    return window.localStorage.getItem(GUEST_PIKACHU_REMOVED_STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

export function markGuestPikachuRemoved(): void {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.setItem(GUEST_PIKACHU_REMOVED_STORAGE_KEY, "true")
  } catch {
    // A full or unavailable localStorage just means the starter reappears on
    // the next visit — not worth surfacing to the guest.
  }
}

export function shouldInjectGuestStarterPikachu(removed: boolean): boolean {
  // The starter Pikachu is a browser-scoped onboarding gift, not a guest-only one:
  // it stays in box 0 across a sign-in and is only gone once the user explicitly
  // removes it (or clears box 0), which sets the removed flag in localStorage.
  return !removed
}
