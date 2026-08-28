import { test, expect, Page } from '@playwright/test';

// Regression: reading localStorage in the useUIState useState initializers made
// the first client render disagree with the SSR HTML for any returning visitor
// whose stored settings differed from the defaults, tripping a React hydration
// mismatch (components/toolSidebar.tsx). The reads now happen in a post-mount
// effect, so SSR and hydration always start from the same defaults.

async function stubBaseRoutes(page: Page) {
  await page.route('**/.well-known/openid-configuration', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        issuer: 'https://dev-test.auth0.com/',
        authorization_endpoint: 'https://dev-test.auth0.com/authorize',
        token_endpoint: 'https://dev-test.auth0.com/oauth/token',
        jwks_uri: 'https://dev-test.auth0.com/.well-known/jwks.json',
        userinfo_endpoint: 'https://dev-test.auth0.com/userinfo',
        id_token_signing_alg_values_supported: ['RS256'],
        response_types_supported: ['code'],
        scopes_supported: ['openid', 'profile', 'email'],
        token_endpoint_auth_methods_supported: ['none'],
        claims_supported: ['sub', 'name', 'email'],
      }),
    })
  );
  await page.route('**/.well-known/jwks.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ keys: [] }) })
  );
  await page.route('**/oauth/token', route => route.abort());
  await page.route('**/api/guest/init', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  );

  const miscResponseKeys: Record<string, string> = {
    abilities: 'abilitiesData',
    items: 'items',
    natures: 'natures',
    moves: 'movesData',
    types: 'types',
    statuses: 'statuses',
  };
  for (const endpoint of Object.keys(miscResponseKeys)) {
    await page.route(`**/misc/${endpoint}`, route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ [miscResponseKeys[endpoint]]: {} }),
      })
    );
  }
  await page.route('**/misc/version', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 'v-test' }) })
  );
  await page.route('**/teams/1', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ allTeams: {} }) })
  );
  await page.route('**/teams/2', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ allTeams: {} }) })
  );
  await page.route('**/myBoxes/count', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 1 }) })
  );
  await page.route('**/myBoxes/0', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ box: {} }) })
  );
}

function collectHydrationErrors(page: Page): string[] {
  const errors: string[] = [];
  const isHydrationMessage = (text: string) =>
    /hydrat/i.test(text) || /did not match/i.test(text) || /server rendered/i.test(text);
  page.on('pageerror', error => {
    if (isHydrationMessage(error.message)) errors.push(error.message);
  });
  page.on('console', message => {
    if (message.type() === 'error' && isHydrationMessage(message.text())) errors.push(message.text());
  });
  return errors;
}

test.describe('Hydration — persisted UI settings do not trip a mismatch', () => {
  test('a returning visitor with non-default stored settings hydrates cleanly', async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);
    await stubBaseRoutes(page);
    await page.addInitScript(() => {
      window.localStorage.setItem('rr_restricted_mode', 'true');
      window.localStorage.setItem('rr_checked_tms', JSON.stringify(['Toxic']));
      window.localStorage.setItem('rr_tutor_tier', '3');
    });

    await page.goto('/');
    await expect(page.getByRole('button', { name: '☰ Tools' })).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle');

    expect(hydrationErrors, hydrationErrors.join('\n')).toEqual([]);
  });

  test('stored settings are applied once hydration completes', async ({ page }) => {
    await stubBaseRoutes(page);
    await page.addInitScript(() => {
      window.localStorage.setItem('rr_restricted_mode', 'true');
      window.localStorage.setItem('rr_checked_tms', JSON.stringify(['Toxic']));
      window.localStorage.setItem('rr_tutor_tier', '3');
    });

    await page.goto('/');
    await page.getByRole('button', { name: '☰ Tools' }).click();

    await expect(page.getByText(/only valid moves will appear/i)).toBeVisible();
    await expect(page.getByText(/1 \/ \d+ checked/)).toBeVisible();
    await expect(
      page.locator('.tool-sidebar-tutor-tier', { hasText: 'Tier 3' }).locator('input[type="checkbox"]')
    ).toBeChecked();
  });

  test('a first-time visitor with an empty store also hydrates cleanly', async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);
    await stubBaseRoutes(page);

    await page.goto('/');
    await expect(page.getByRole('button', { name: '☰ Tools' })).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle');

    expect(hydrationErrors, hydrationErrors.join('\n')).toEqual([]);
  });
});
