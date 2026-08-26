import { test, expect } from '@playwright/test';

test.describe('Tools sidebar TM/HM and Move Tutor checklists', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  async function openSidebar(page: import('@playwright/test').Page) {
    const toolsButton = page.getByRole('button', { name: '☰ Tools' });
    await toolsButton.click();
    await expect(page.getByText(/only valid moves will appear/i)).toBeVisible();
    return toolsButton;
  }

  test('notice banner explains the move-validity rule', async ({ page }) => {
    await openSidebar(page);
    await expect(
      page.getByText(/moves are valid if the pokemon is at or above the level/i)
    ).toBeVisible();
  });

  test('checking a TM updates the checked count and its row styling', async ({ page }) => {
    await openSidebar(page);

    await expect(page.getByText(/0 \/ \d+ checked/)).toBeVisible();

    const toxicRow = page.locator('label', { hasText: 'Toxic' }).first();
    await toxicRow.locator('input[type="checkbox"]').check();

    await expect(page.getByText(/1 \/ \d+ checked/)).toBeVisible();
    await expect(toxicRow.locator('input[type="checkbox"]')).toBeChecked();
  });

  test('checking a tutor tier auto-checks every tier below it', async ({ page }) => {
    await openSidebar(page);

    const tierOne = page.locator('.tool-sidebar-tutor-tier', { hasText: 'Tier 1' });
    const tierTwo = page.locator('.tool-sidebar-tutor-tier', { hasText: 'Tier 2' });
    const tierThree = page.locator('.tool-sidebar-tutor-tier', { hasText: 'Tier 3' });
    const tierFour = page.locator('.tool-sidebar-tutor-tier', { hasText: 'Tier 4' });

    await tierThree.locator('input[type="checkbox"]').check();

    await expect(tierOne.locator('input[type="checkbox"]')).toBeChecked();
    await expect(tierTwo.locator('input[type="checkbox"]')).toBeChecked();
    await expect(tierThree.locator('input[type="checkbox"]')).toBeChecked();
    await expect(tierFour.locator('input[type="checkbox"]')).not.toBeChecked();
    await expect(page.getByText('tiers 1–3 unlocked')).toBeVisible();
  });

  test('unchecking a tutor tier auto-unchecks every tier above it', async ({ page }) => {
    await openSidebar(page);

    const tierTwo = page.locator('.tool-sidebar-tutor-tier', { hasText: 'Tier 2' });
    const tierThree = page.locator('.tool-sidebar-tutor-tier', { hasText: 'Tier 3' });

    await tierThree.locator('input[type="checkbox"]').check();
    await tierTwo.locator('input[type="checkbox"]').uncheck();

    await expect(tierThree.locator('input[type="checkbox"]')).not.toBeChecked();
  });

  test('the full move list for an unlocked tier renders as a vertical list', async ({ page }) => {
    await openSidebar(page);

    const tierThree = page.locator('.tool-sidebar-tutor-tier', { hasText: 'Tier 3' });
    await tierThree.locator('input[type="checkbox"]').check();

    await expect(tierThree.locator('li', { hasText: 'Fire Punch' })).toBeVisible();
    await expect(tierThree.locator('li', { hasText: 'Psychic Fangs' })).toBeVisible();
  });

  test('checked TMs and the unlocked tutor tier persist across a reload', async ({ page }) => {
    await openSidebar(page);

    const toxicRow = page.locator('label', { hasText: 'Toxic' }).first();
    await toxicRow.locator('input[type="checkbox"]').check();
    const tierThree = page.locator('.tool-sidebar-tutor-tier', { hasText: 'Tier 3' });
    await tierThree.locator('input[type="checkbox"]').check();

    await page.reload();
    await expect(page.getByRole('button', { name: '☰ Tools' })).toBeVisible();
    await openSidebar(page);

    await expect(page.locator('label', { hasText: 'Toxic' }).first().locator('input[type="checkbox"]')).toBeChecked();
    await expect(page.locator('.tool-sidebar-tutor-tier', { hasText: 'Tier 3' }).locator('input[type="checkbox"]')).toBeChecked();
    await expect(page.locator('.tool-sidebar-tutor-tier', { hasText: 'Tier 1' }).locator('input[type="checkbox"]')).toBeChecked();
  });

  test('Tools button closes the sidebar again on a second click', async ({ page }) => {
    const toolsButton = await openSidebar(page);
    await expect(page.locator('.tool-sidebar')).toHaveClass(/tool-sidebar-open/);

    await toolsButton.click();
    await expect(page.locator('.tool-sidebar')).toHaveClass(/tool-sidebar-closed/);
  });
});
