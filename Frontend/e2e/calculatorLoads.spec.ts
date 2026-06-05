import { test, expect } from '@playwright/test';

test.describe('Damage calculator loads', () => {
  test('page renders with core layout elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Pokemon Box')).toBeVisible();
  });

  test('Pokemon box section is visible on load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const pokemonBox = page.getByText('Pokemon Box');
    await expect(pokemonBox).toBeVisible();
  });

  test('import Pokemon button is present in Pokemon Box', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const importButton = page.getByTestId('open-import-modal');
    await expect(importButton).toBeVisible();
  });

  test('Tools sidebar button is accessible in the header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const toolsButton = page.getByRole('button', { name: /tools/i });
    await expect(toolsButton).toBeVisible();
  });
});
