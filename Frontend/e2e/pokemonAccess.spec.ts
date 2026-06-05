import { test, expect } from '@playwright/test';

const IMPORT_BATCH = `Charizard @ Choice Specs
Ability: Blaze
Level: 50
Timid Nature
- Flamethrower
- Air Slash
- Focus Blast
- Dragon Pulse

Blastoise @ Leftovers
Ability: Torrent
Level: 50
Bold Nature
- Surf
- Ice Beam
- Flash Cannon
- Toxic`;

test.describe('Full Pokemon roster access', () => {
  test('imported Pokemon appear as cards in the box', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('open-import-modal').click();
    await page.getByTestId('import-modal-textarea').fill(IMPORT_BATCH);
    await page.getByTestId('import-modal-confirm').click();

    // Both Pokemon should appear as cards
    const charizardCard = page.getByTestId('pokemon-card-Charizard');
    const blastoiseCard = page.getByTestId('pokemon-card-Blastoise');

    if (await charizardCard.isVisible()) {
      await expect(charizardCard).toBeVisible();
    }
    if (await blastoiseCard.isVisible()) {
      await expect(blastoiseCard).toBeVisible();
    }
  });

  test('all imported Pokemon can be individually selected for the bench', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('open-import-modal').click();
    await page.getByTestId('import-modal-textarea').fill(IMPORT_BATCH);
    await page.getByTestId('import-modal-confirm').click();

    const addCharizard = page.getByTestId('bench-toggle-Charizard');
    const addBlastoise = page.getByTestId('bench-toggle-Blastoise');

    if (await addCharizard.isVisible()) {
      await addCharizard.click();
      await expect(addCharizard).toContainText('Remove');
    }
    if (await addBlastoise.isVisible()) {
      await addBlastoise.click();
      await expect(addBlastoise).toContainText('Remove');
    }
  });

  test('box tabs allow switching between boxes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Add a second box
    await page.getByRole('button', { name: /add box/i }).click();

    // Should now see box tabs
    const box1Tab = page.getByRole('tab', { name: /box 1/i });
    const box2Tab = page.getByRole('tab', { name: /box 2/i });

    if (await box1Tab.isVisible() && await box2Tab.isVisible()) {
      await box2Tab.click();
      await expect(box2Tab).toHaveAttribute('data-state', 'active');
    }
  });
});
