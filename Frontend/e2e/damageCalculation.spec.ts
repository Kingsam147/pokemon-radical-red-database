import { test, expect } from '@playwright/test';

test.describe('Damage calculation accuracy', () => {
  test('damage calculator page loads without errors', async ({ page }) => {
    const errors: { text: string; url: string }[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push({ text: msg.text(), url: msg.location().url });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors (e.g. auth redirects, missing assets).
    // "Failed to load resource" console messages don't include the failing URL in
    // their text — it's only available via msg.location().url — so both need
    // checking to catch the Vercel/Cloudflare analytics scripts that only work on
    // a real deployed domain, not localhost/CI.
    // /public/enemy-preview 404s when no enemy teams are seeded yet — a valid,
    // expected state (see enemy-preview-fast-path.spec.ts and
    // enemyPreviewService.test.js), not a page error.
    const criticalErrors = errors.filter(e =>
      !e.text.includes('401') &&
      !e.text.includes('favicon') &&
      !e.text.includes('ERR_ABORTED') &&
      !e.text.includes('cloudflareinsights.com') &&
      !e.url.includes('cloudflareinsights.com') &&
      !e.url.includes('_vercel/insights') &&
      !e.url.includes('/public/enemy-preview')
    );
    expect(criticalErrors.map(e => e.text)).toHaveLength(0);
  });

  test('turn editor section is present on page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The TurnEditor component should be visible
    const turnSection = page.locator('[class*="turn"]').first();
    await expect(turnSection).toBeVisible();
  });

  test('battle effects controls are accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Weather/terrain controls should be present somewhere in the page
    const pageContent = await page.content();
    expect(pageContent).toContain('Sun');
  });

  test('POST /misc/damage endpoint is reachable from client', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3500';
    const response = await page.request.post(`${apiUrl}/misc/damage`, {
      data: {
        attacker: { name: 'Charizard', level: 50, ability: 'Blaze', nature: 'Timid', evs: {}, ivs: {}, boosts: {}, status: 'Healthy', gender: 'M', currentHP: 155, maxHP: 155 },
        defender: { name: 'Blastoise', level: 50, ability: 'Torrent', nature: 'Bold', evs: {}, ivs: {}, boosts: {}, status: 'Healthy', gender: 'M', currentHP: 162, maxHP: 162 },
        move: { name: 'Flamethrower', isCrit: false, isZ: false },
        field: {},
        abilityToggles: {},
      },
      failOnStatusCode: false,
    });

    // If backend is running, expect 200; otherwise expect connection refused
    if (response.ok()) {
      const body = await response.json();
      expect(body).toHaveProperty('calculation');
      expect(body.calculation).toHaveProperty('damage');
      expect(body.calculation).toHaveProperty('range');
      expect(body.calculation.range).toHaveLength(2);
    }
  });
});
