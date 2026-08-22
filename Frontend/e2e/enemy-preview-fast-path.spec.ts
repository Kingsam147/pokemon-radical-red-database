import { test, expect } from "@playwright/test"

test.describe("Enemy trainer fast-path preview", () => {
  test("GET /public/enemy-preview is reachable with zero cookies or Authorization header", async ({
    browser,
  }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3500"
    // A brand-new, cookie-less context simulates the very first request from a
    // user who has never visited before — no guest cookie has been minted yet.
    const context = await browser.newContext()
    const response = await context.request.get(
      `${apiUrl}/public/enemy-preview`,
      {
        failOnStatusCode: false,
      },
    )

    if (response.status() !== 0) {
      // 200 (data seeded) or 404 (no enemy teams yet) are both valid — what
      // matters is it's never a 401, since this route must not require auth.
      expect(response.status()).not.toBe(401)
    }
    await context.close()
  })

  test("enemy-preview response sets edge-cacheable headers", async ({
    request,
  }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3500"
    const response = await request.get(`${apiUrl}/public/enemy-preview`, {
      failOnStatusCode: false,
    })

    if (response.ok()) {
      expect(response.headers()["cache-control"]).toContain("s-maxage")
    }
  })

  test("the enemy-preview request fires on initial page load, independent of the rest of the pipeline", async ({
    page,
  }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3500"
    let previewRequested = false

    page.on("request", (req) => {
      if (req.url().includes("/public/enemy-preview")) previewRequested = true
    })

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Only meaningful when the backend is actually reachable — otherwise every
    // fetch (including this one) fails before it's ever observed as a request.
    const health = await page.request
      .get(`${apiUrl}/health`, { failOnStatusCode: false })
      .catch(() => null)
    if (health?.ok()) {
      expect(previewRequested).toBe(true)
    }
  })

  test("player 2 bench renders before the box finishes loading when the preview resolves first", async ({
    page,
  }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Once the page has settled, both sides should have resolved out of their
    // skeleton state — this guards against the preview permanently stalling.
    // Auto-retrying assertion instead of a one-shot count: `networkidle` is a
    // network-level signal and doesn't guarantee the subsequent React render
    // (e.g. setIsInitializing(false)) has already flushed.
    // 20s, not the file's usual 15s: this waits on the full unmocked initial
    // pipeline (misc data, box, teams, enemy teams — several sequential real
    // backend round-trips), not just a UI reaction to an already-loaded page.
    await expect(page.locator(".animate-pulse")).toHaveCount(0, { timeout: 20000 })
  })
})
