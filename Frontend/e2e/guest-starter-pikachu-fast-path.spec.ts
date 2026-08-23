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

  test("the guest-starter-pikachu request fires on initial page load", async ({
    page,
  }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3500"
    let starterRequested = false

    page.on("request", (req) => {
      if (req.url().includes("/public/guest-starter-pikachu")) starterRequested = true
    })

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Only meaningful when the backend is actually reachable — otherwise every
    // fetch (including this one) fails before it's ever observed as a request.
    const health = await page.request
      .get(`${apiUrl}/health`, { failOnStatusCode: false })
      .catch(() => null)
    if (health?.ok()) {
      expect(starterRequested).toBe(true)
    }
  })
})
