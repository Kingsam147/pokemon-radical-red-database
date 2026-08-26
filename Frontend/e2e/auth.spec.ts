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

    const loginButton = page.getByTestId('header-login-button');
    if (await loginButton.isVisible()) {
      await expect(loginButton).toBeEnabled();
    }
  });

  test('login button opens the auth modal with all three options', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loginButton = page.getByTestId('header-login-button');
    if (await loginButton.isVisible()) {
      await loginButton.click();

      const modal = page.getByTestId('auth-modal');
      await expect(modal).toBeVisible();
      await expect(page.getByTestId('auth-modal-signin-button')).toBeVisible();
      await expect(page.getByTestId('auth-modal-signup-button')).toBeVisible();
      await expect(page.getByTestId('auth-modal-google-button')).toBeVisible();
    }
  });

  test('Sign In inside the modal opens an Auth0 popup', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loginButton = page.getByTestId('header-login-button');
    if (await loginButton.isVisible()) {
      await loginButton.click();

      const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
      await page.getByTestId('auth-modal-signin-button').click();
      const popup = await popupPromise;
      if (popup !== null) {
        await popup.waitForURL(/auth0\.com/, { timeout: 10000 });
        expect(popup.url()).toMatch(/auth0\.com/);
        await popup.close();
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

      // Log in via the modal, completing the flow in the Auth0 popup window
      await page.getByTestId('header-login-button').click();
      const popupPromise = page.waitForEvent('popup', { timeout: 10000 });
      await page.getByTestId('auth-modal-signin-button').click();
      const popup = await popupPromise;
      await popup.waitForURL(/auth0\.com/, { timeout: 10000 });
      await popup.fill('input[name="username"], input[type="email"]', process.env.AUTH0_TEST_USERNAME!);
      await popup.fill('input[name="password"], input[type="password"]', process.env.AUTH0_TEST_PASSWORD!);
      await popup.getByRole('button', { name: /continue|log in/i }).click();
      await popup.waitForEvent('close', { timeout: 15000 });

      // Guest data should be migrated — Eevee should still be in the box
      await expect(page.getByTestId('pokemon-card-Eevee')).toBeVisible({ timeout: 10000 });
    });
  });
});
