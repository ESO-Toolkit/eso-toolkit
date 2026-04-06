import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for the login race condition fix (fix/token-refresh-infinite-loop).
 *
 * Covers three failure modes that previously caused users to be redirected to /login
 * immediately after completing the OAuth flow:
 *
 * 1. My Reports page loads correctly after login (happy path regression)
 * 2. Concurrent refresh calls share one in-flight Promise — the single-use refresh
 *    token is never burned twice (deduplication guard in refreshAccessToken)
 * 3. API 401 → token refresh → retry recovers without logging the user out
 *    (the authLink now reads this.accessToken dynamically instead of a stale closure)
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a Base64url-encoded mock JWT. Signature is fake — the app only decodes,
 * never verifies, so this is sufficient for E2E tests.
 */
function createMockJwt(options: { expiresInSecs?: number; expired?: boolean } = {}): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = options.expired ? now - 60 : now + (options.expiresInSecs ?? 3600);

  // btoa is available globally in Node 16+
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({ sub: 'test-user-123', exp, scopes: ['view-user-profile'] }),
  );
  return `${header}.${payload}.mock-signature`;
}

/**
 * Injects tokens into localStorage before any app JS runs, so the module-level
 * `initialToken` in EsoLogsClientContext picks up the mock value on first render.
 */
async function injectTokens(
  page: Page,
  options: { accessToken?: string; refreshToken?: string } = {},
): Promise<void> {
  const accessToken = options.accessToken ?? createMockJwt();
  const refreshToken = options.refreshToken ?? 'mock-refresh-token';

  await page.addInitScript(
    ({ at, rt }: { at: string; rt: string }) => {
      localStorage.setItem('access_token', at);
      localStorage.setItem('refresh_token', rt);
    },
    { at: accessToken, rt: refreshToken },
  );
}

const MOCK_USER = {
  __typename: 'User',
  id: 123,
  name: 'TestUser',
  naDisplayName: null,
  euDisplayName: null,
};

const MOCK_REPORTS_RESPONSE = {
  data: {
    reportData: {
      __typename: 'ReportData',
      reports: { __typename: 'ReportPagination', total: 0, data: [] },
    },
  },
};

/**
 * Intercepts all ESO Logs API calls and returns canned responses so tests run
 * fully offline without hitting esologs.com.
 */
async function mockEsoLogsApi(
  page: Page,
  options: {
    /** Return a GraphQL UNAUTHENTICATED error for the first N getCurrentUser calls */
    rejectFirstNUserRequests?: number;
  } = {},
): Promise<void> {
  let userRequestCount = 0;
  const rejectN = options.rejectFirstNUserRequests ?? 0;

  await page.route('**/api/v2/**', async (route) => {
    const postData = route.request().postDataJSON() as { query?: string } | null;
    const queryStr = postData?.query ?? '';

    if (queryStr.includes('currentUser') || queryStr.includes('getCurrentUser')) {
      userRequestCount++;
      if (userRequestCount <= rejectN) {
        // Simulate a server-side auth failure for the first N calls
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{ message: 'Unauthenticated', extensions: { code: 'UNAUTHENTICATED' } }],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { userData: { currentUser: MOCK_USER } } }),
        });
      }
    } else if (queryStr.includes('getUserReports')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_REPORTS_RESPONSE),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Intercepts the ESO Logs OAuth token endpoint and returns a fresh mock token.
 * Returns a counter so tests can assert how many refresh calls were made.
 */
async function mockRefreshEndpoint(page: Page): Promise<{ getCallCount: () => number }> {
  let callCount = 0;

  await page.route('**/oauth/token', async (route) => {
    const body = route.request().postData() ?? '';
    // Only intercept refresh_token grant requests — ignore other token exchange calls
    if (body.includes('grant_type=refresh_token')) {
      callCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: createMockJwt({ expiresInSecs: 3600 }),
          refresh_token: 'new-refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      });
    } else {
      await route.continue();
    }
  });

  return { getCallCount: () => callCount };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Login race condition (token refresh)', () => {
  test('My Reports renders after login — no redirect to /login', async ({ page }) => {
    await injectTokens(page);
    await mockEsoLogsApi(page);

    await page.goto('/my-reports');
    await page.waitForLoadState('networkidle');

    // Wait for the page to settle (auth context → user fetch → reports fetch)
    await expect(page.getByRole('heading', { name: /my reports/i })).toBeVisible({
      timeout: 15000,
    });

    // Must not have been redirected to the login page
    expect(page.url()).not.toContain('/login');
  });

  test('My Reports page shows no login-required prompt while user data is loading', async ({
    page,
  }) => {
    await injectTokens(page);
    await mockEsoLogsApi(page);

    // Track any moment the "Please log in" alert becomes visible during load
    const loginPromptObserved: boolean[] = [];
    const pollingHandle = setInterval(() => {
      void page
        .locator('text=/Please log in to view your reports/i')
        .isVisible()
        .then((visible) => {
          if (visible) loginPromptObserved.push(true);
        })
        .catch(() => undefined);
    }, 100);

    await page.goto('/my-reports');
    await page.waitForLoadState('networkidle');
    clearInterval(pollingHandle);

    // "Please log in" should never appear during the load — the skeleton takes its place
    expect(loginPromptObserved).toHaveLength(0);
  });

  test('concurrent token refresh uses a single HTTP request (deduplication)', async ({ page }) => {
    // Token that expires in 30 s — inside the 60 s proactive-refresh window — so
    // AuthContext fires the proactive refresh on mount. If a query also gets a 401,
    // both code paths call refreshAccessToken() concurrently. The deduplication guard
    // in auth.ts must ensure only one /oauth/token request is made.
    const nearlyExpiredToken = createMockJwt({ expiresInSecs: 30 });
    await injectTokens(page, { accessToken: nearlyExpiredToken });

    // The first getCurrentUser call will get a 401, triggering the error-link refresh.
    // Simultaneously the proactive timer fires. Both share one pending promise.
    await mockEsoLogsApi(page, { rejectFirstNUserRequests: 1 });
    const { getCallCount } = await mockRefreshEndpoint(page);

    await page.goto('/my-reports');
    await page.waitForLoadState('networkidle');

    // No redirect to login — the page recovered
    expect(page.url()).not.toContain('/login');

    // At most one refresh HTTP call was made (deduplication guard)
    expect(getCallCount()).toBeLessThanOrEqual(1);
  });

  test('API 401 triggers refresh and the page recovers without logging out', async ({ page }) => {
    await injectTokens(page);

    // Reject the first getCurrentUser — simulates a server-side token rejection
    // even though the local JWT appears valid (clock skew / revocation).
    await mockEsoLogsApi(page, { rejectFirstNUserRequests: 1 });
    await mockRefreshEndpoint(page);

    await page.goto('/my-reports');
    await page.waitForLoadState('networkidle');

    // After the refresh + retry cycle the page should load normally
    await expect(page.getByRole('heading', { name: /my reports/i })).toBeVisible({
      timeout: 15000,
    });
    expect(page.url()).not.toContain('/login');
  });

  test('expired token redirects to login (expected behaviour, not a regression)', async ({
    page,
  }) => {
    // An expired access token must still result in a login redirect — we don't
    // want the fix to accidentally keep expired sessions alive.
    const expiredToken = createMockJwt({ expired: true });
    await injectTokens(page, { accessToken: expiredToken, refreshToken: '' });

    // No refresh token → refreshAccessToken returns null → tokens cleared → redirect
    await page.route('**/oauth/token', (route) => route.abort());

    await page.goto('/my-reports');
    await page.waitForLoadState('networkidle');

    // Should land on /login
    expect(page.url()).toContain('/login');
  });
});
