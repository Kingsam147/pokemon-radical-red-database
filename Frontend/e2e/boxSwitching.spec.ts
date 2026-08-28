import { test, expect, Page } from '@playwright/test';

const EMPTY_BOX_RESPONSE = { box: {} };

async function stubBaseRoutes(page: Page, boxCount = 3) {
  // Allow Auth0 SDK to initialize as unauthenticated (no existing session in storage)
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

  // Wrapper keys must match what lib/api/misc.ts unwraps from each response
  // (e.g. NATURE_OPTIONS() reads natureListJSON.natures) — a bare `{}` here
  // resolves every option list to `undefined` instead of an empty object.
  const MISC_RESPONSE_KEYS: Record<string, string> = {
    abilities: 'abilitiesData',
    items: 'items',
    natures: 'natures',
    moves: 'movesData',
    types: 'types',
    statuses: 'statuses',
  };
  for (const endpoint of Object.keys(MISC_RESPONSE_KEYS)) {
    await page.route(`**/misc/${endpoint}`, route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ [MISC_RESPONSE_KEYS[endpoint]]: {} }),
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
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: boxCount }) })
  );

  await page.route('**/myBoxes/0', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_BOX_RESPONSE) })
  );
}

test.describe('Box switching — lazy load and prefetch', () => {
  test('renders one tab per box returned by the count endpoint', async ({ page }) => {
    await stubBaseRoutes(page, 3);
    await page.route('**/myBoxes/1', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_BOX_RESPONSE) })
    );
    await page.route('**/myBoxes/2', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_BOX_RESPONSE) })
    );

    await page.goto('/');

    await expect(page.getByRole('tab', { name: 'Starter Pikachu Box' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('tab', { name: 'Box 2' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Box 3' })).toBeVisible();
  });

  test('shows 30 skeleton slots when clicking an unloaded box tab', async ({ page }) => {
    await stubBaseRoutes(page, 2);

    // Hold box 1 response until the test controls release it
    let releaseBox1: () => void;
    const box1Latch = new Promise<void>(resolve => { releaseBox1 = resolve; });
    await page.route('**/myBoxes/1', async route => {
      await box1Latch;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_BOX_RESPONSE) });
    });

    await page.goto('/');
    await expect(page.getByRole('tab', { name: 'Starter Pikachu Box' })).toBeVisible({ timeout: 15000 });

    // Click the second tab before prefetch resolves it — skeleton should appear
    await page.getByRole('tab', { name: 'Box 2' }).click();

    const skeletonSlots = page.locator('.pokemon-box-skeleton-slot');
    await expect(skeletonSlots.first()).toBeVisible({ timeout: 5000 });
    await expect(skeletonSlots).toHaveCount(30);

    releaseBox1!();
  });

  test('prefetches all boxes beyond box 0 after initial load', async ({ page }) => {
    const fetchedIndices = new Set<number>();

    await stubBaseRoutes(page, 3);
    await page.route('**/myBoxes/1', route => {
      fetchedIndices.add(1);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_BOX_RESPONSE) });
    });
    await page.route('**/myBoxes/2', route => {
      fetchedIndices.add(2);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_BOX_RESPONSE) });
    });

    await page.goto('/');
    await expect(page.getByRole('tab', { name: 'Starter Pikachu Box' })).toBeVisible({ timeout: 15000 });

    // Poll for the prefetch loop to complete instead of a fixed wait — real
    // backend latency (unmocked requests elsewhere on the page) can push the
    // sequential fetches past any fixed timeout.
    await expect.poll(() => fetchedIndices.has(1) && fetchedIndices.has(2), {
      timeout: 10000,
    }).toBe(true);
  });

  test('switching to a prefetched box shows content immediately without skeleton', async ({ page }) => {
    await stubBaseRoutes(page, 2);
    await page.route('**/myBoxes/1', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_BOX_RESPONSE) })
    );

    await page.goto('/');
    await expect(page.getByRole('tab', { name: 'Starter Pikachu Box' })).toBeVisible({ timeout: 15000 });

    // Wait for prefetch to fill in all remaining boxes
    await page.waitForTimeout(3000);

    // Click box 2 — already prefetched, skeleton must not appear
    await page.getByRole('tab', { name: 'Box 2' }).click();
    await expect(page.locator('.pokemon-box-skeleton-slot')).toHaveCount(0);
  });

  test('Delete Box button is disabled while a box is loading', async ({ page }) => {
    await stubBaseRoutes(page, 2);

    let releaseBox1: () => void;
    const box1Latch = new Promise<void>(resolve => { releaseBox1 = resolve; });
    await page.route('**/myBoxes/1', async route => {
      await box1Latch;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_BOX_RESPONSE) });
    });

    await page.goto('/');
    await expect(page.getByRole('tab', { name: 'Starter Pikachu Box' })).toBeVisible({ timeout: 15000 });

    await page.getByRole('tab', { name: 'Box 2' }).click();

    const deleteButton = page.getByRole('button', { name: 'Delete Box' });
    await expect(deleteButton).toBeDisabled({ timeout: 3000 });

    releaseBox1!();
    await expect(deleteButton).toBeEnabled({ timeout: 5000 });
  });
});

test.describe('Guest starter Pikachu — box and team placement', () => {
  test('guest Pikachu appears both in the active team selector and inside Starter Pikachu Box', async ({ page }) => {
    await stubBaseRoutes(page, 1);

    await page.goto('/');

    await expect(page.getByRole('tab', { name: 'Starter Pikachu Box' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel('Select Team 1')).toHaveValue('Example Pikachu Team');
    await expect(page.getByTestId('pokemon-card-Pikachu')).toBeVisible();
  });
});

test.describe('Guest starter Pikachu — removal persists across visits', () => {
  test('removing the starter from box 0 keeps it gone after a reload', async ({ page }) => {
    await stubBaseRoutes(page, 1);
    let starterDeleteRequested = false;
    await page.route('**/myBoxes/0/**', route => {
      if (route.request().method() === 'DELETE') starterDeleteRequested = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ updatedBox: {} }) });
    });
    page.on('dialog', dialog => dialog.accept());

    await page.goto('/');
    await expect(page.getByTestId('pokemon-card-Pikachu')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Remove Pokemon' }).click();
    await page.getByTestId('pokemon-card-Pikachu').click();

    await expect(page.getByTestId('pokemon-card-Pikachu')).toHaveCount(0);
    expect(starterDeleteRequested).toBe(false);
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('rr_guest_pikachu_removed')))
      .toBe('true');

    await page.reload();
    await expect(page.getByRole('tab', { name: 'Starter Pikachu Box' })).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('pokemon-card-Pikachu')).toHaveCount(0);
    await expect(page.getByLabel('Select Team 1')).not.toHaveValue('Example Pikachu Team');
  });

  test('a guest whose removal flag is already set never sees the starter injected', async ({ page }) => {
    await stubBaseRoutes(page, 1);
    await page.addInitScript(() => {
      window.localStorage.setItem('rr_guest_pikachu_removed', 'true');
    });

    await page.goto('/');
    await expect(page.getByRole('tab', { name: 'Starter Pikachu Box' })).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('pokemon-card-Pikachu')).toHaveCount(0);
    await expect(page.getByLabel('Select Team 1')).not.toHaveValue('Example Pikachu Team');
  });

  test('clearing box 0 keeps the starter gone after a reload', async ({ page }) => {
    await stubBaseRoutes(page, 1);
    let boxZeroCleared = false;
    await page.route('**/myBoxes/0', route => {
      if (route.request().method() === 'PUT') boxZeroCleared = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ box: {} }) });
    });
    page.on('dialog', dialog => dialog.accept());

    await page.goto('/');
    await expect(page.getByTestId('pokemon-card-Pikachu')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Clear Box' }).click();

    await expect.poll(() => boxZeroCleared).toBe(true);
    await expect(page.getByTestId('pokemon-card-Pikachu')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('rr_guest_pikachu_removed')))
      .toBe('true');

    await page.reload();
    await expect(page.getByRole('tab', { name: 'Starter Pikachu Box' })).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('pokemon-card-Pikachu')).toHaveCount(0);
    await expect(page.getByLabel('Select Team 1')).not.toHaveValue('Example Pikachu Team');
  });
});
