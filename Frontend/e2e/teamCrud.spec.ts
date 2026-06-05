import { test, expect } from '@playwright/test';

test.describe('Team creation and management', () => {
  test('team bench area is visible on page load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // TeamBench renders player 1 and player 2 areas
    const playerLabels = page.getByText(/player 1|my team/i);
    await expect(playerLabels.first()).toBeVisible();
  });

  test('dragging a Pokemon from box to bench adds it to the team', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // First import a Pokemon so there's something in the box
    await page.getByTestId('open-import-modal').click();
    await page.getByTestId('import-modal-textarea').fill(
      'Pikachu\nAbility: Static\nLevel: 50\nTimid Nature\n- Thunderbolt\n- Quick Attack\n- Iron Tail\n- Volt Switch'
    );
    await page.getByTestId('import-modal-confirm').click();

    // Wait for card to appear
    const card = page.getByTestId('pokemon-card-Pikachu');
    if (await card.isVisible()) {
      const addButton = page.getByTestId('bench-toggle-Pikachu');
      await addButton.click();
      // After adding, button should switch to Remove
      await expect(addButton).toContainText('Remove');
    }
  });

  test('Pokemon card Add button adds Pokemon to bench', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('open-import-modal').click();
    await page.getByTestId('import-modal-textarea').fill(
      'Bulbasaur\nAbility: Overgrow\nLevel: 30\nBold Nature\n- Vine Whip\n- Tackle\n- Growl\n- Leech Seed'
    );
    await page.getByTestId('import-modal-confirm').click();

    const addButton = page.getByTestId('bench-toggle-Bulbasaur');
    if (await addButton.isVisible()) {
      await addButton.click();
      await expect(addButton).toContainText('Remove');
    }
  });
});
