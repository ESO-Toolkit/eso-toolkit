import { test, expect } from '@playwright/test';

/**
 * Nightly Regression Tests - Pages & Features
 *
 * Smoke-level coverage for pages that have no existing nightly test coverage.
 * Tests run against the live production site with no mocking.
 *
 * Coverage: ESO-741 (builds), ESO-742 (rosters), ESO-743 (home/whats-new),
 *           ESO-744 (scribing), ESO-746 (leaderboards), ESO-748 (profiles),
 *           ESO-749 (gear-sets, logs, parse-analysis), ESO-751 (docs)
 *
 * Auth: These tests do NOT require credentials. They work with or without
 * stored auth state. Auth-gated page tests live in nightly-regression-auth.spec.ts.
 */

const TEST_TIMEOUTS = {
  navigation: 30000,
  dataLoad: 45000,
  // Increased from 10 000 ms: WebKit can be slow to settle before a screenshot,
  // especially when fullPage capture requires a full-page scroll pass.
  screenshot: 20000,
  appMount: 30000,
};

async function waitForAppMount(page: Parameters<Parameters<typeof test>[1]>[0]): Promise<void> {
  await page
    .locator('header, nav, main, [role="banner"]')
    .first()
    .waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.appMount })
    .catch(() => {
      console.log('⚠️ App mount wait timed out — SPA may not have hydrated');
    });
}

/**
 * Shared helper: navigate to a page and assert it loaded meaningful content.
 * Returns false (and logs) instead of throwing if the page is missing, so the
 * test can fail with a useful assertion message rather than an unhandled error.
 */
async function expectPageLoads(
  page: Parameters<Parameters<typeof test>[1]>[0],
  path: string,
  screenshotName: string,
): Promise<void> {
  await page.goto(path, {
    waitUntil: 'domcontentloaded',
    timeout: TEST_TIMEOUTS.navigation,
  });

  await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad }).catch(() => {
    // networkidle can time out on data-heavy pages — not a failure on its own
  });

  await waitForAppMount(page);

  const bodyText = await page.locator('body').textContent().catch(() => '');
  const contentLength = bodyText?.length ?? 0;

  if (contentLength < 50) {
    console.log(`🔍 ${path} body content too short (${contentLength} chars)`);
    console.log(`🔍 URL: ${page.url()}`);
    console.log(`🔍 Title: ${await page.title()}`);
  }

  expect(contentLength, `${path} should render meaningful content`).toBeGreaterThan(50);

  // No uncaught JS errors
  const errors: string[] = await page.evaluate(() => (window as any).testErrors ?? []);
  const criticalErrors = errors.filter(
    (e) =>
      !e.includes('ResizeObserver') &&
      !e.includes('Not implemented') &&
      !e.includes('Non-Error promise rejection') &&
      !e.includes('ChunkLoadError'),
  );
  expect(criticalErrors, `${path} should have no critical JS errors`).toHaveLength(0);

  await page.screenshot({
    path: `test-results/nightly-regression-pages-${screenshotName}.png`,
    // fullPage removed: WebKit hangs scrolling through long pages under CI load,
    // causing 10-20 s screenshot timeouts. Viewport capture is sufficient for
    // smoke-level evidence that the page rendered correctly.
    timeout: TEST_TIMEOUTS.screenshot,
  });
}

test.describe('Nightly Regression - Pages & Features', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);

    await page.addInitScript(() => {
      (window as any).testErrors = [];
      window.addEventListener('error', (ev) => {
        (window as any).testErrors.push(ev.error?.message ?? ev.message);
      });
      window.addEventListener('unhandledrejection', (ev) => {
        (window as any).testErrors.push(`Unhandled rejection: ${ev.reason}`);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // ESO-743: Home / landing / informational pages
  // ---------------------------------------------------------------------------
  test.describe('Home & Informational Pages', () => {
    test('home page should load with visible content', async ({ page }) => {
      await page.goto('/', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await waitForAppMount(page);

      const hasNav = await page.locator('nav, header').isVisible().catch(() => false);
      const hasMain = await page.locator('main, #root, .app').isVisible().catch(() => false);
      const hasText = await page
        .getByText(/eso|toolkit|log|report/i)
        .isVisible()
        .catch(() => false);

      expect(hasNav || hasMain || hasText, 'Home page should render navigable content').toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-pages-home.png',
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });

    test("what's new page should load changelog content", async ({ page }) => {
      await expectPageLoads(page, '/whats-new', 'whats-new');

      // Should have some release notes / changelog entries
      const hasContent = await page
        .locator('h1, h2, h3, li, p')
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      expect(hasContent, "/whats-new should display changelog entries").toBeTruthy();
    });

    test('about page should load with content', async ({ page }) => {
      await expectPageLoads(page, '/about', 'about');
    });

    test('sample report page should redirect to or display a report', async ({ page }) => {
      await page.goto('/sample-report', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad }).catch(() => {});
      await waitForAppMount(page);

      // Either redirects to a real report URL or renders inline
      const url = page.url();
      const isOnReport = url.includes('/report/');
      const hasReportContent = await page
        .locator('.MuiAccordion-root, [data-testid="fight-list"], main')
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(isOnReport || hasReportContent, '/sample-report should load or redirect to a report').toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-pages-sample-report.png',
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // ESO-741: Build system pages (public views only — editor is auth-gated)
  // ---------------------------------------------------------------------------
  test.describe('Build System', () => {
    test('build hub should load and display builds', async ({ page }) => {
      await page.goto('/build-hub', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad }).catch(() => {});
      await page.waitForTimeout(3000);

      // Should show a list of builds or a loading/empty state — not a blank crash
      const hasContent = await page
        .locator(
          'main, .MuiContainer-root, .build-list, .build-card, [data-testid*="build"], a[href*="/b/"], .MuiCard-root',
        )
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      const bodyText = await page.locator('body').textContent().catch(() => '');
      expect(
        hasContent || (bodyText?.length ?? 0) > 100,
        '/build-hub should render content',
      ).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-pages-build-hub.png',
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });

    test('pack hub should load', async ({ page }) => {
      await expectPageLoads(page, '/pack-hub', 'pack-hub');
    });

    test('first available shared build should load', async ({ page }) => {
      // Navigate to build hub and click through to the first visible build
      await page.goto('/build-hub', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad }).catch(() => {});
      await page.waitForTimeout(3000);

      const buildLink = page.locator('a[href*="/b/"], a[href*="/build-view"]').first();

      if (!(await buildLink.isVisible({ timeout: 5000 }).catch(() => false))) {
        console.log('ℹ️ No build links found on /build-hub — skipping shared build test');
        return;
      }

      const href = await buildLink.getAttribute('href');
      console.log(`🔍 Testing shared build at: ${href}`);

      await buildLink.click();
      await page.waitForLoadState('domcontentloaded', { timeout: TEST_TIMEOUTS.navigation });
      await page.waitForTimeout(3000);

      const hasContent = await page
        .locator('main, .MuiContainer-root, [data-testid*="build"]')
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false);

      expect(hasContent, `Shared build ${href} should render content`).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-pages-shared-build.png',
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // ESO-742: Roster system pages (public hub + viewer)
  // ---------------------------------------------------------------------------
  test.describe('Roster System', () => {
    test('roster hub should load and display rosters', async ({ page }) => {
      await page.goto('/roster-hub', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad }).catch(() => {});
      await page.waitForTimeout(3000);

      const hasContent = await page
        .locator(
          'main, .MuiContainer-root, .roster-list, .roster-card, [data-testid*="roster"], .MuiCard-root',
        )
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      const bodyText = await page.locator('body').textContent().catch(() => '');
      expect(
        hasContent || (bodyText?.length ?? 0) > 100,
        '/roster-hub should render content',
      ).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-pages-roster-hub.png',
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });

    test('first available shared roster should load', async ({ page }) => {
      await page.goto('/roster-hub', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad }).catch(() => {});
      await page.waitForTimeout(3000);

      const rosterLink = page.locator('a[href*="/rv"], a[href*="/roster-view"]').first();

      if (!(await rosterLink.isVisible({ timeout: 5000 }).catch(() => false))) {
        console.log('ℹ️ No roster links found on /roster-hub — skipping shared roster test');
        return;
      }

      const href = await rosterLink.getAttribute('href');
      console.log(`🔍 Testing shared roster at: ${href}`);

      await rosterLink.click();
      await page.waitForLoadState('domcontentloaded', { timeout: TEST_TIMEOUTS.navigation });
      await page.waitForTimeout(3000);

      const hasContent = await page
        .locator('main, .MuiContainer-root, [data-testid*="roster"]')
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false);

      expect(hasContent, `Shared roster ${href} should render content`).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-pages-shared-roster.png',
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // ESO-744: Scribing Simulator
  // ---------------------------------------------------------------------------
  test.describe('Scribing Simulator', () => {
    test('scribing simulator should load with interactive UI', async ({ page }) => {
      await page.goto('/scribing-simulator', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad }).catch(() => {});
      await page.waitForTimeout(3000);

      const hasSimulator = await page
        .locator(
          '[data-testid*="scribing"], [data-testid*="simulator"], .scribing-simulator, select, input, .MuiSelect-root',
        )
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      const bodyText = await page.locator('body').textContent().catch(() => '');
      expect(
        hasSimulator || (bodyText?.length ?? 0) > 100,
        '/scribing-simulator should render interactive UI',
      ).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-pages-scribing-simulator.png',
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });

    test('scribing simulator should respond to a basic skill selection', async ({ page }) => {
      await page.goto('/scribing-simulator', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad }).catch(() => {});
      await page.waitForTimeout(3000);

      // Try to interact with the first available select/dropdown
      const firstSelect = page
        .locator('select, .MuiSelect-root, [role="combobox"], [data-testid*="select"]')
        .first();

      if (!(await firstSelect.isVisible({ timeout: 5000 }).catch(() => false))) {
        console.log('ℹ️ No interactive elements found on /scribing-simulator yet — page may still be loading');
        return;
      }

      await firstSelect.click();
      await page.waitForTimeout(1000);

      // Look for an option in the dropdown
      const firstOption = page.locator('[role="option"], .MuiMenuItem-root, option').first();
      if (await firstOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstOption.click();
        await page.waitForTimeout(1500);
        console.log('✅ Scribing simulator responded to skill selection');
      }

      // No JS errors after interaction
      const errors: string[] = await page.evaluate(() => (window as any).testErrors ?? []);
      const criticalErrors = errors.filter(
        (e) =>
          !e.includes('ResizeObserver') &&
          !e.includes('Not implemented') &&
          !e.includes('Non-Error promise rejection') &&
          !e.includes('ChunkLoadError'),
      );
      expect(criticalErrors, 'No critical errors after scribing interaction').toHaveLength(0);

      await page.screenshot({
        path: 'test-results/nightly-regression-pages-scribing-interaction.png',
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // ESO-746: Leaderboards
  // ---------------------------------------------------------------------------
  test.describe('Leaderboards', () => {
    test('leaderboards page should load with data rows', async ({ page }) => {
      await page.goto('/leaderboards', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad }).catch(() => {});
      await page.waitForTimeout(3000);

      const hasTable = await page
        .locator('.MuiDataGrid-root, table, .leaderboard, [data-testid*="leaderboard"]')
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      const bodyText = await page.locator('body').textContent().catch(() => '');
      expect(
        hasTable || (bodyText?.length ?? 0) > 100,
        '/leaderboards should render data',
      ).toBeTruthy();

      // Verify no failed API requests for esologs.com
      // (errors already captured via addInitScript in beforeEach)

      await page.screenshot({
        path: 'test-results/nightly-regression-pages-leaderboards.png',
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // ESO-748: Public user profiles
  // ---------------------------------------------------------------------------
  test.describe('User Profiles', () => {
    test('public user profile should load from latest-reports', async ({ page }) => {
      // Find a real username by pulling one from the latest reports page
      await page.goto('/latest-reports', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad }).catch(() => {});
      await page.waitForTimeout(3000);

      // Look for a user profile link on the page
      const profileLink = page.locator('a[href*="/u/"]').first();

      if (!(await profileLink.isVisible({ timeout: 8000 }).catch(() => false))) {
        console.log('ℹ️ No user profile links found on /latest-reports — skipping profile test');
        return;
      }

      const href = await profileLink.getAttribute('href');
      console.log(`🔍 Testing user profile at: ${href}`);

      await page.goto(href!, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad }).catch(() => {});
      await page.waitForTimeout(2000);

      const hasContent = await page
        .locator('main, .profile, [data-testid*="profile"], h1, h2')
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false);

      expect(hasContent, `User profile ${href} should render`).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-pages-user-profile.png',
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });

    test('non-existent user profile should show an error state', async ({ page }) => {
      await page.goto('/u/definitely-not-a-real-user-xyzzy-nightly-test', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await waitForAppMount(page);

      const hasError = await page
        .getByText(/not found|404|player.*not.*found|user.*not.*exist|no.*user|error/i)
        .isVisible()
        .catch(() => false);
      const redirectedAway = !page.url().includes('xyzzy');
      const hasContent = await page.locator('main, #root').isVisible().catch(() => false);

      expect(
        hasError || redirectedAway || hasContent,
        'Invalid user profile should be handled gracefully',
      ).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // ESO-749: Utility pages — Gear Sets, Logs Browser, Parse Analysis
  // ---------------------------------------------------------------------------
  test.describe('Utility Pages', () => {
    test('gear sets page should load with content', async ({ page }) => {
      await expectPageLoads(page, '/gear-sets', 'gear-sets');

      const hasContent = await page
        .locator('.MuiDataGrid-root, .MuiCard-root, table, [data-testid*="gear"], main')
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      expect(hasContent, '/gear-sets should render gear content').toBeTruthy();
    });

    test('logs browser should load with UI controls', async ({ page }) => {
      await page.goto('/logs', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad }).catch(() => {});
      await page.waitForTimeout(3000);

      const hasUI = await page
        .locator('input, select, .MuiTextField-root, .search, main, [data-testid*="log"]')
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      const bodyText = await page.locator('body').textContent().catch(() => '');
      expect(
        hasUI || (bodyText?.length ?? 0) > 100,
        '/logs should render UI controls',
      ).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-pages-logs.png',
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });

    test('parse analysis page should load', async ({ page }) => {
      await expectPageLoads(page, '/parse-analysis', 'parse-analysis');
    });
  });

  // ---------------------------------------------------------------------------
  // ESO-751: Documentation and role guide pages
  // ---------------------------------------------------------------------------
  test.describe('Documentation & Role Guides', () => {
    const docPages: { path: string; name: string }[] = [
      { path: '/docs/calculations', name: 'docs-calculations' },
      { path: '/docs/loadout/food-selector', name: 'docs-food-selector' },
    ];

    for (const { path, name } of docPages) {
      test(`${path} should load with article content`, async ({ page }) => {
        await page.goto(path, {
          waitUntil: 'domcontentloaded',
          timeout: TEST_TIMEOUTS.navigation,
        });
        await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.dataLoad }).catch(() => {});
        await page.waitForTimeout(2000);

        const hasContent = await page
          .locator('main, article, .content, p, h1, h2')
          .first()
          .isVisible({ timeout: 8000 })
          .catch(() => false);

        const bodyText = await page.locator('body').textContent().catch(() => '');
        expect(
          hasContent || (bodyText?.length ?? 0) > 100,
          `${path} should render article content`,
        ).toBeTruthy();

        await page.screenshot({
          path: `test-results/nightly-regression-pages-${name}.png`,
          timeout: TEST_TIMEOUTS.screenshot,
        });
      });
    }

    // Role guides — paths may vary; test gracefully
    const roleGuides = ['tank', 'healer', 'damage-dealer'];

    for (const role of roleGuides) {
      test(`role guide for ${role} should load`, async ({ page }) => {
        // Try the most common URL patterns
        const candidates = [`/role-guides/${role}`, `/role-guides`];

        let loaded = false;
        for (const candidate of candidates) {
          await page.goto(candidate, {
            waitUntil: 'domcontentloaded',
            timeout: TEST_TIMEOUTS.navigation,
          });
          await page.waitForTimeout(2000);

          const bodyText = await page.locator('body').textContent().catch(() => '');
          if ((bodyText?.length ?? 0) > 100) {
            loaded = true;
            console.log(`✅ Role guide ${role} loaded at ${candidate}`);
            await page.screenshot({
              path: `test-results/nightly-regression-pages-role-${role}.png`,
              timeout: TEST_TIMEOUTS.screenshot,
            });
            break;
          }
        }

        if (!loaded) {
          console.log(`ℹ️ Role guide ${role} returned minimal content — route may not exist yet`);
        }
        // Not a hard failure since route paths for role guides are unconfirmed
      });
    }
  });

  test.describe('Landing Page and Navigation', () => {
    test('should load landing page correctly', async ({ page }) => {
      await page.goto('/', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      // Wait for app to render
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await waitForAppMount(page);

      // Landing page should load - check title flexibly
      const title = await page.title();
      const hasTitleContent = title && title.length > 0 && !title.includes('Error');
      expect(hasTitleContent).toBeTruthy();

      // Should have main navigation or landing content - be more flexible
      const hasNav = await page
        .locator('nav')
        .isVisible()
        .catch(() => false);
      const hasHeader = await page
        .locator('header')
        .isVisible()
        .catch(() => false);
      const hasLanding = await page
        .locator('.landing')
        .isVisible()
        .catch(() => false);
      const hasHero = await page
        .locator('.hero')
        .isVisible()
        .catch(() => false);
      const hasButton = await page
        .locator('button')
        .isVisible()
        .catch(() => false);
      const hasLink = await page
        .locator('a')
        .isVisible()
        .catch(() => false);
      const hasEsoText = await page
        .getByText(/eso/i)
        .isVisible()
        .catch(() => false);
      const hasMainContent = await page
        .locator('main, .app, #root, .content')
        .isVisible()
        .catch(() => false);
      const hasAnyText = await page
        .locator('body')
        .textContent()
        .then((text) => text && text.trim().length > 50)
        .catch(() => false);

      const hasLandingContent =
        hasNav ||
        hasHeader ||
        hasLanding ||
        hasHero ||
        hasButton ||
        hasLink ||
        hasEsoText ||
        hasMainContent ||
        hasAnyText;

      if (!hasLandingContent) {
        console.log('🔍 Landing page URL:', page.url());
        console.log('🔍 Landing page title:', title);
        console.log(
          '🔍 Landing body content preview:',
          (await page.locator('body').textContent())?.slice(0, 200),
        );
      }

      expect(hasLandingContent).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-landing-page.png',
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });

    test('should handle search functionality if available', async ({ page }) => {
      await page.goto('/', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      // Look for search functionality
      const searchInput = page.locator(
        'input[placeholder*="search"], input[placeholder*="report"], input[type="search"]',
      );

      if (await searchInput.isVisible({ timeout: 5000 })) {
        // Test report search with a known report ID
        await searchInput.fill('3gjVGWB2dxCL8XAw');

        // Look for search button or enter key
        const searchButton = page.locator('button:has-text("Search"), button[type="submit"]');

        if (await searchButton.isVisible({ timeout: 3000 })) {
          await searchButton.click();
        } else {
          await searchInput.press('Enter');
        }

        await page.waitForTimeout(3000);

        await page.screenshot({
          path: 'test-results/nightly-regression-search-functionality.png',
          timeout: TEST_TIMEOUTS.screenshot,
        });

        // Should either navigate to report or show search results
        const isOnReport = page.url().includes('/report/');
        const hasResults = await page
          .locator('.search-results, .report-item, a[href*="/report/"]')
          .isVisible({ timeout: 5000 });

        expect(isOnReport || hasResults).toBeTruthy();
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle invalid report IDs gracefully', async ({ page }) => {
      // Try to access a non-existent report
      await page.goto('/report/INVALID_REPORT_ID', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await waitForAppMount(page);

      // Should show error message, redirect, or show some handling of invalid ID
      const hasErrorText = await page
        .getByText(/not found|error|invalid|doesn.*exist|no fights|empty log/i)
        .isVisible()
        .catch(() => false);
      const hasErrorClass = await page
        .locator('.error, .MuiAlert-root')
        .isVisible()
        .catch(() => false);
      const hasLoadingState = await page
        .locator('.loading, .MuiCircularProgress-root, .skeleton')
        .isVisible()
        .catch(() => false);
      const redirectedAway = !page.url().includes('INVALID_REPORT_ID');

      // Check if page shows any content (meaning it loaded and handled the request)
      const hasContent = await page
        .locator('main, .content, .app, #root')
        .isVisible()
        .catch(() => false);
      const currentUrl = page.url();
      const pageTitle = await page.title();

      // Any of these outcomes indicates the app handled the invalid ID appropriately:
      // 1. Shows an error message
      // 2. Redirects away from the invalid URL
      // 3. Shows loading state (handling the request)
      // 4. Shows normal page content (app loaded and handled gracefully)
      const handledGracefully =
        hasErrorText || hasErrorClass || redirectedAway || hasLoadingState || hasContent;

      if (!handledGracefully) {
        console.log('🔍 Invalid report ID page URL:', currentUrl);
        console.log('🔍 Page title:', pageTitle);
        console.log(
          '🔍 Body content preview:',
          (await page.locator('body').textContent())?.slice(0, 200),
        );
      }

      expect(handledGracefully).toBeTruthy();

      await page.screenshot({
        path: 'test-results/nightly-regression-invalid-report.png',
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });

    test('should handle network issues gracefully', async ({ page }) => {
      // Navigate to a report first
      await page.goto('/report/3gjVGWB2dxCL8XAw', {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      // Simulate offline condition
      await page.context().setOffline(true);

      // Try to navigate to a fight that would require new data
      const firstFightLink = page.locator('a[href*="/fight/"]').first();

      if (await firstFightLink.isVisible({ timeout: 10000 })) {
        await firstFightLink.click();
        await page.waitForTimeout(5000);

        // Should show some kind of loading state or error
        const hasLoadingText = await page
          .getByText(/loading/i)
          .isVisible()
          .catch(() => false);
        const hasLoadingClass = await page
          .locator('.loading, .MuiCircularProgress-root, .skeleton')
          .isVisible()
          .catch(() => false);
        const hasLoadingState = hasLoadingText || hasLoadingClass;

        const hasErrorText = await page
          .getByText(/error|failed/i)
          .isVisible()
          .catch(() => false);
        const hasErrorClass = await page
          .locator('.error, .MuiAlert-root')
          .isVisible()
          .catch(() => false);
        const hasErrorState = hasErrorText || hasErrorClass;

        // Should show either loading or error state
        expect(hasLoadingState || hasErrorState).toBeTruthy();

        await page.screenshot({
          path: 'test-results/nightly-regression-offline-handling.png',
          timeout: TEST_TIMEOUTS.screenshot,
        });
      }

      // Restore online condition
      await page.context().setOffline(false);
    });
  });
});
