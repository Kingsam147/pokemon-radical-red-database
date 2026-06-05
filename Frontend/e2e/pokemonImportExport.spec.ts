import { test, expect } from '@playwright/test';

const CHARIZARD_IMPORT = `Charizard @ Choice Specs
Ability: Blaze
Level: 50
Timid Nature
EVs: 252 SpA / 252 Spe / 4 HP
- Flamethrower
- Air Slash
- Focus Blast
- Dragon Pulse`;

test.describe('Pokemon import via modal', () => {
  test('import modal opens when Import Pokemon button is clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('open-import-modal').click();
    await expect(page.getByTestId('import-modal-textarea')).toBeVisible();
  });

  test('import modal closes when Cancel is clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('open-import-modal').click();
    await page.getByTestId('import-modal-cancel').click();
    await expect(page.getByTestId('import-modal-textarea')).not.toBeVisible();
  });

  test('textarea accepts pasted Pokemon text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('open-import-modal').click();
    await page.getByTestId('import-modal-textarea').fill(CHARIZARD_IMPORT);
    await expect(page.getByTestId('import-modal-textarea')).toHaveValue(CHARIZARD_IMPORT);
  });

  test('confirming import triggers the import flow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('open-import-modal').click();
    await page.getByTestId('import-modal-textarea').fill(CHARIZARD_IMPORT);
    await page.getByTestId('import-modal-confirm').click();

    // Modal should close after confirm
    await expect(page.getByTestId('import-modal-textarea')).not.toBeVisible();
  });
});

test.describe('Pokemon export via Tools sidebar', () => {
  test('Generate Export button is visible in Tools sidebar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const toolsButton = page.getByRole('button', { name: /tools/i });
    await toolsButton.click();

    await expect(page.getByTestId('export-button')).toBeVisible();
  });

  test('clicking Generate Export populates the export output area', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const toolsButton = page.getByRole('button', { name: /tools/i });
    await toolsButton.click();

    await page.getByTestId('export-button').click();
    const exportOutput = page.getByTestId('export-output');
    await expect(exportOutput).toBeVisible();
  });

  test('export output textarea is readonly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const toolsButton = page.getByRole('button', { name: /tools/i });
    await toolsButton.click();

    const exportOutput = page.getByTestId('export-output');
    await expect(exportOutput).toHaveAttribute('readonly', '');
  });
});
