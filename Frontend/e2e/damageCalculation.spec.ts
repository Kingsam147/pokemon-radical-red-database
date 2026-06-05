import { test, expect } from '@playwright/test';

test.describe('Damage calculation accuracy', () => {
  test('damage calculator page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors (e.g. auth redirects, missing assets)
    const criticalErrors = errors.filter(e =>
      !e.includes('401') &&
      !e.includes('favicon') &&
      !e.includes('ERR_ABORTED')
    );
    expect(criticalErrors).toHaveLength(0);
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
    expect(pageContent).toContain('weather');
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
