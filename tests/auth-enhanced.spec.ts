import { expect, test, type Page } from '@playwright/test';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const OAUTH_STATE_KEY = 'eso_oauth_state';
const PKCE_VERIFIER_KEY = 'eso_code_verifier';

interface CredentialSnapshot {
  localAccessToken: string | null;
  localRefreshToken: string | null;
  sessionAccessToken: string | null;
  sessionRefreshToken: string | null;
}

const createToken = (expiresInMs: number): string => {
  const encode = (value: Record<string, string | number>): string =>
    Buffer.from(JSON.stringify(value)).toString('base64url');

  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    sub: 'auth-contract-user',
    exp: Math.floor((Date.now() + expiresInMs) / 1000),
  })}.deterministic-signature`;
};

const readCredentials = (page: Page): Promise<CredentialSnapshot> =>
  page.evaluate(
    ({ accessTokenKey, refreshTokenKey }) => ({
      localAccessToken: window.localStorage.getItem(accessTokenKey),
      localRefreshToken: window.localStorage.getItem(refreshTokenKey),
      sessionAccessToken: window.sessionStorage.getItem(accessTokenKey),
      sessionRefreshToken: window.sessionStorage.getItem(refreshTokenKey),
    }),
    { accessTokenKey: ACCESS_TOKEN_KEY, refreshTokenKey: REFRESH_TOKEN_KEY },
  );

const expectCredentialsCleared = async (page: Page): Promise<void> => {
  await expect
    .poll(() => readCredentials(page))
    .toEqual({
      localAccessToken: null,
      localRefreshToken: null,
      sessionAccessToken: null,
      sessionRefreshToken: null,
    });
};

const installSessionCredentials = async (
  page: Page,
  accessToken: string,
  refreshToken?: string,
): Promise<void> => {
  await page.addInitScript(
    ({ accessToken, accessTokenKey, refreshToken: storedRefreshToken, refreshTokenKey }) => {
      window.sessionStorage.setItem(accessTokenKey, accessToken);
      if (storedRefreshToken) {
        window.sessionStorage.setItem(refreshTokenKey, storedRefreshToken);
      }
    },
    {
      accessToken,
      accessTokenKey: ACCESS_TOKEN_KEY,
      refreshToken,
      refreshTokenKey: REFRESH_TOKEN_KEY,
    },
  );
};

const mockAuthenticatedApi = async (page: Page): Promise<void> => {
  await page.route('**://www.esologs.com/api/v2/**', async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        data: {
          userData: {
            currentUser: {
              id: 1,
              name: 'Auth Contract User',
            },
          },
        },
      }),
      contentType: 'application/json',
      status: 200,
    });
  });
};

test.describe('tab-scoped OAuth credentials', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedApi(page);
  });

  test('stores an OAuth exchange only in the current tab and removes legacy persistent credentials', async ({
    page,
  }) => {
    await page.route('**://www.esologs.com/oauth/token', async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          access_token: 'issued-access-token',
          refresh_token: 'issued-refresh-token',
        }),
        contentType: 'application/json',
        status: 200,
      });
    });
    await page.addInitScript(
      ({ accessTokenKey, oauthStateKey, pkceVerifierKey, refreshTokenKey }) => {
        window.localStorage.setItem(accessTokenKey, 'legacy-access-token');
        window.localStorage.setItem(refreshTokenKey, 'legacy-refresh-token');
        window.sessionStorage.setItem(oauthStateKey, 'expected-state');
        window.sessionStorage.setItem(pkceVerifierKey, 'deterministic-pkce-verifier');
      },
      {
        accessTokenKey: ACCESS_TOKEN_KEY,
        oauthStateKey: OAUTH_STATE_KEY,
        pkceVerifierKey: PKCE_VERIFIER_KEY,
        refreshTokenKey: REFRESH_TOKEN_KEY,
      },
    );

    await page.goto('/oauth-redirect?code=deterministic-code&state=expected-state');
    await page.waitForURL((url) => url.pathname === '/');

    await expect
      .poll(() => readCredentials(page))
      .toEqual({
        localAccessToken: null,
        localRefreshToken: null,
        sessionAccessToken: 'issued-access-token',
        sessionRefreshToken: 'issued-refresh-token',
      });
    await expect
      .poll(() =>
        page.evaluate(
          (oauthStateKey) => window.sessionStorage.getItem(oauthStateKey),
          OAUTH_STATE_KEY,
        ),
      )
      .toBeNull();

    await page.reload();
    await expect
      .poll(() => readCredentials(page))
      .toEqual({
        localAccessToken: null,
        localRefreshToken: null,
        sessionAccessToken: 'issued-access-token',
        sessionRefreshToken: 'issued-refresh-token',
      });
  });

  test('rejects a mismatched OAuth callback state before token exchange', async ({ page }) => {
    let tokenRequests = 0;
    await page.route('**://www.esologs.com/oauth/token', async (route) => {
      tokenRequests += 1;
      await route.fulfill({
        body: JSON.stringify({ access_token: createToken(60 * 60 * 1000) }),
        contentType: 'application/json',
        status: 200,
      });
    });
    await page.addInitScript(
      ({ oauthStateKey, pkceVerifierKey }) => {
        window.sessionStorage.setItem(oauthStateKey, 'expected-state');
        window.sessionStorage.setItem(pkceVerifierKey, 'expected-pkce-verifier');
      },
      { oauthStateKey: OAUTH_STATE_KEY, pkceVerifierKey: PKCE_VERIFIER_KEY },
    );
    const oauthStateError = page.getByRole('alert').filter({ hasText: 'OAuth state mismatch' });

    await page.goto('/oauth-redirect?code=forged-code&state=mismatched-state');

    await expect(oauthStateError).toContainText('OAuth state mismatch');
    await expect.poll(() => tokenRequests).toBe(0);
    await expect
      .poll(() =>
        page.evaluate(
          (oauthStateKey) => window.sessionStorage.getItem(oauthStateKey),
          OAUTH_STATE_KEY,
        ),
      )
      .toBeNull();
  });

  test('rejects a replayed OAuth callback state before token exchange', async ({ page }) => {
    let tokenRequests = 0;
    await page.route('**://www.esologs.com/oauth/token', async (route) => {
      tokenRequests += 1;
      await route.fulfill({
        body: JSON.stringify({ access_token: createToken(60 * 60 * 1000) }),
        contentType: 'application/json',
        status: 200,
      });
    });
    const oauthStateError = page.getByRole('alert').filter({ hasText: 'OAuth state mismatch' });
    await page.addInitScript((pkceVerifierKey) => {
      window.sessionStorage.setItem(pkceVerifierKey, 'replayed-pkce-verifier');
    }, PKCE_VERIFIER_KEY);

    await page.goto('/oauth-redirect?code=replayed-code&state=replayed-state');

    await expect(oauthStateError).toContainText('OAuth state mismatch');
    await expect.poll(() => tokenRequests).toBe(0);
    await expect
      .poll(() =>
        page.evaluate(
          (oauthStateKey) => window.sessionStorage.getItem(oauthStateKey),
          OAUTH_STATE_KEY,
        ),
      )
      .toBeNull();
  });

  test('renders malicious provider errors as inert text', async ({ page }) => {
    const maliciousError = '<img src=x onerror="window.__oauthInjected=true">provider-denied';

    await page.goto(`/oauth-redirect?error=${encodeURIComponent(maliciousError)}`);

    const oauthErrorAlert = page.getByRole('alert').filter({ hasText: 'OAuth error:' });
    await expect(oauthErrorAlert).toHaveText(`OAuth error: ${maliciousError}`);
    await expect(oauthErrorAlert.locator('img, script')).toHaveCount(0);
  });

  test('redirects unauthenticated protected routes and preserves the intended destination', async ({
    page,
  }) => {
    const protectedDestination = '/whoami?source=auth-contract#account';

    await page.goto(protectedDestination);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('login-title')).toHaveText('ESO Toolkit');
    await expect(page.getByRole('button', { name: 'Connect to ESO Logs' })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          (intendedDestinationKey) => window.localStorage.getItem(intendedDestinationKey),
          'eso_intended_destination',
        ),
      )
      .toBe(protectedDestination);
  });

  test('fails closed on a protected route when token renewal is rejected', async ({ page }) => {
    let renewalRequests = 0;
    await page.route('**://www.esologs.com/oauth/token', async (route) => {
      renewalRequests += 1;
      await route.fulfill({
        body: JSON.stringify({ error: 'invalid_grant' }),
        contentType: 'application/json',
        status: 401,
      });
    });
    await installSessionCredentials(page, createToken(30 * 1000), 'protected-route-refresh-token');

    await page.goto('/whoami');

    await expect.poll(() => renewalRequests).toBeGreaterThan(0);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('login-title')).toHaveText('ESO Toolkit');
    await expectCredentialsCleared(page);
  });

  test('removes legacy localStorage credentials instead of reviving or migrating them', async ({
    page,
  }) => {
    await page.addInitScript(
      ({ accessTokenKey, refreshTokenKey }) => {
        window.localStorage.setItem(accessTokenKey, 'legacy-access-token');
        window.localStorage.setItem(refreshTokenKey, 'legacy-refresh-token');
      },
      { accessTokenKey: ACCESS_TOKEN_KEY, refreshTokenKey: REFRESH_TOKEN_KEY },
    );

    await page.goto('/');

    await expectCredentialsCleared(page);
    await expect(page.getByRole('button', { name: /^Profile/ })).toHaveCount(0);
  });

  test('keeps credentials through a same-tab reload but never shares them with another tab', async ({
    page,
  }) => {
    const accessToken = createToken(60 * 60 * 1000);
    await installSessionCredentials(page, accessToken, 'tab-scoped-refresh-token');

    await page.goto('/');
    await expect(page.getByRole('button', { name: /^Profile/ })).toBeVisible();
    await page.reload();
    await expect
      .poll(() => readCredentials(page))
      .toMatchObject({
        sessionAccessToken: accessToken,
        sessionRefreshToken: 'tab-scoped-refresh-token',
      });

    const isolatedPage = await page.context().newPage();
    await mockAuthenticatedApi(isolatedPage);
    await isolatedPage.goto('/');
    await expectCredentialsCleared(isolatedPage);
    await expect(isolatedPage.getByRole('button', { name: /^Profile/ })).toHaveCount(0);
    await isolatedPage.close();
  });

  test('fails closed for expired credentials and clears both tab credentials when renewal is rejected', async ({
    page,
  }) => {
    await installSessionCredentials(page, createToken(-60 * 1000));
    await page.goto('/');

    await expect(page.getByRole('button', { name: /^Profile/ })).toHaveCount(0);
    await expect
      .poll(() => readCredentials(page))
      .toMatchObject({
        sessionAccessToken: expect.any(String),
        sessionRefreshToken: null,
      });

    let renewalRequests = 0;
    const renewalPage = await page.context().newPage();
    await mockAuthenticatedApi(renewalPage);
    await renewalPage.route('**://www.esologs.com/oauth/token', async (route) => {
      renewalRequests += 1;
      await route.fulfill({
        body: JSON.stringify({ error: 'invalid_grant' }),
        contentType: 'application/json',
        status: 401,
      });
    });
    await installSessionCredentials(renewalPage, createToken(30 * 1000), 'rejected-refresh-token');
    await renewalPage.goto('/');

    await expect.poll(() => renewalRequests).toBeGreaterThan(0);
    await expectCredentialsCleared(renewalPage);
    await renewalPage.close();
  });

  test('logout clears session credentials and any surviving legacy credentials', async ({
    page,
  }) => {
    await installSessionCredentials(page, createToken(60 * 60 * 1000), 'logout-refresh-token');
    await page.addInitScript(
      ({ accessTokenKey, refreshTokenKey }) => {
        window.localStorage.setItem(accessTokenKey, 'legacy-access-token');
        window.localStorage.setItem(refreshTokenKey, 'legacy-refresh-token');
      },
      { accessTokenKey: ACCESS_TOKEN_KEY, refreshTokenKey: REFRESH_TOKEN_KEY },
    );

    await page.goto('/');
    await page.getByRole('button', { name: /^Profile/ }).click();
    await page.getByText('Sign out', { exact: true }).click();

    await expectCredentialsCleared(page);
    await expect(page.getByRole('button', { name: /^Profile/ })).toHaveCount(0);
  });
});
