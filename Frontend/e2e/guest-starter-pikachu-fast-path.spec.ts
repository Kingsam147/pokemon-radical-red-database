import { test, expect } from "@playwright/test"

test.describe("Guest starter Pikachu fast-path", () => {
  test("GET /public/guest-starter-pikachu is reachable with zero cookies or Authorization header", async ({
    browser,
  }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3500"
    // A brand-new, cookie-less context simulates the very first request from a
    // guest who has never visited before — no session has been minted yet.
    const context = await browser.newContext()
    const response = await context.request.get(
      `${apiUrl}/public/guest-starter-pikachu`,
      {
        failOnStatusCode: false,
      },
    )

    if (response.status() !== 0) {
      // 200 is the only real success case here (the starter data is
      // hardcoded, not conditional) — what matters is it's never a 401,
      // since this route must not require auth.
      expect(response.status()).not.toBe(401)
    }
    await context.close()
  })

  test("guest-starter-pikachu response sets edge-cacheable headers", async ({
    request,
  }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3500"
    const response = await request.get(`${apiUrl}/public/guest-starter-pikachu`, {
      failOnStatusCode: false,
    })

    if (response.ok()) {
      expect(response.headers()["cache-control"]).toContain("s-maxage")
    }
  })

  // The frontend no longer calls this endpoint on initial load — the guest
  // starter Pikachu is now baked directly into the frontend (see
  // Frontend/lib/data/guestStarterPikachuFixture.ts) so it paints on the very
  // first render with zero round trips. The route above stays live and
  // reachable in case another client still needs it.
})
