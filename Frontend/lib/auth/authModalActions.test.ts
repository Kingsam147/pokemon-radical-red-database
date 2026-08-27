import { describe, test, expect } from "vitest"
import { getPopupAuthorizationParams, isPopupCancelled } from "@/lib/auth/authModalActions"

describe("getPopupAuthorizationParams", () => {
  test("signin returns undefined so loginWithPopup uses its default screen", () => {
    expect(getPopupAuthorizationParams("signin")).toBeUndefined()
  })

  test("signup returns the signup screen hint", () => {
    expect(getPopupAuthorizationParams("signup")).toEqual({ screen_hint: "signup" })
  })

  test("google returns the google-oauth2 connection", () => {
    expect(getPopupAuthorizationParams("google")).toEqual({ connection: "google-oauth2" })
  })
})

describe("isPopupCancelled", () => {
  test("returns true for Auth0's PopupCancelledError shape", () => {
    expect(isPopupCancelled({ error: "cancelled", error_description: "Popup closed" })).toBe(true)
  })

  test("returns false for other Auth0 OAuth errors", () => {
    expect(isPopupCancelled({ error: "access_denied", error_description: "user denied access" })).toBe(false)
  })

  test("returns false for non-Auth0 error shapes", () => {
    expect(isPopupCancelled(new Error("network failure"))).toBe(false)
    expect(isPopupCancelled("plain string")).toBe(false)
    expect(isPopupCancelled(null)).toBe(false)
    expect(isPopupCancelled(undefined)).toBe(false)
  })
})
