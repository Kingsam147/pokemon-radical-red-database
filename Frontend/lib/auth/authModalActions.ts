export type AuthModalAction = "signin" | "signup" | "google"

export interface PopupAuthorizationParams {
  screen_hint?: string
  connection?: string
}

export function getPopupAuthorizationParams(
  action: AuthModalAction
): PopupAuthorizationParams | undefined {
  if (action === "signup") return { screen_hint: "signup" }
  if (action === "google") return { connection: "google-oauth2" }
  return undefined
}

export function isPopupCancelled(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "error" in err &&
    (err as { error?: unknown }).error === "cancelled"
  )
}
