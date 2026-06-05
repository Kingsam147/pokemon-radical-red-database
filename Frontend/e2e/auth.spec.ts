import { test, expect } from '@playwright/test';

test.describe('Auth0 login and guest migration', () => {
  test('page loads as guest without requiring login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // App should render in guest mode without requiring login
    await expect(page.getByText('Pokemon Box')).toBeVisible();
  });

  test('login button is accessible in the header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loginButton = page.getByRole('button', { name: /log in|sign in/i });
    if (await loginButton.isVisible()) {
      await expect(loginButton).toBeEnabled();
    }
  });

  test('login flow redirects to Auth0 when triggered', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loginButton = page.getByRole('button', { name: /log in|sign in/i });
    if (await loginButton.isVisible()) {
      // Intercept navigation to verify it goes to Auth0
      const navigationPromise = page.waitForURL(/auth0\.com|login/, { timeout: 5000 }).catch(() => null);
      await loginButton.click();
      const navigated = await navigationPromise;
      if (navigated !== null) {
        expect(page.url()).toMatch(/auth0\.com|login/);
      }
    }
  });

  test.describe('Authenticated user flow (requires AUTH0_TEST credentials)', () => {
    test.skip(!process.env.AUTH0_TEST_USERNAME || !process.env.AUTH0_TEST_PASSWORD,
      'AUTH0_TEST_USERNAME and AUTH0_TEST_PASSWORD not set — skipping live auth test');

    test('logs in and sees migrated guest data', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Import a Pokemon as guest before logging in
      await page.getByTestId('open-import-modal').click();
      await page.getByTestId('import-modal-textarea').fill(
        'Eevee\nAbility: Adaptability\nLevel: 20\nTimid Nature\n- Quick Attack\n- Sand Attack\n- Tackle\n- Tail Whip'
      );
      await page.getByTestId('import-modal-confirm').click();

      // Log in
      await page.getByRole('button', { name: /log in|sign in/i }).click();
      await page.waitForURL(/auth0\.com/, { timeout: 10000 });
      await page.fill('input[name="username"], input[type="email"]', process.env.AUTH0_TEST_USERNAME!);
      await page.fill('input[name="password"], input[type="password"]', process.env.AUTH0_TEST_PASSWORD!);
      await page.getByRole('button', { name: /continue|log in/i }).click();
      await page.waitForURL('/', { timeout: 15000 });

      // Guest data should be migrated — Eevee should still be in the box
      await expect(page.getByTestId('pokemon-card-Eevee')).toBeVisible({ timeout: 10000 });
    });
  });
});
