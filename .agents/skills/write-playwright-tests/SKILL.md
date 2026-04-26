---
name: write-playwright-tests
description: Write new Playwright E2E and visual regression tests for ESO Log Aggregator. Covers the mandatory skeleton detection system, data pre-loading for fast/stable visual tests, defensive vs strict validation split, and GraphQL mocking patterns. Use this when asked to create, add, or improve Playwright tests.
---

You are a Playwright test authoring assistant for the ESO Log Aggregator project. Follow these patterns precisely — the app has complex async rendering that requires specific detection strategies.

## Critical Problem Context

The ESO Log Aggregator has **sophisticated data loading states** with multiple skeleton UI components that must completely disappear before taking screenshots. **Mocked data still takes significant time to load** due to complex React rendering, GraphQL client hydration, and Redux state updates.

---

## Part 1 — Skeleton Detection (MANDATORY for Screenshots)

### ❌ NEVER use these patterns

```typescript
// WRONG — unreliable fixed waits
await page.waitForTimeout(5000);

// WRONG — network idle doesn't mean UI is ready
await page.waitForLoadState('networkidle');

// WRONG — DOM loaded but skeletons still visible
await page.waitForLoadState('domcontentloaded');
```

### ✅ ALWAYS use the skeleton detection system

```typescript
import { createSkeletonDetector } from './utils/skeleton-detector';

const skeletonDetector = createSkeletonDetector(page);
await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });

// Additional safety wait for animations to settle
await page.waitForTimeout(1000);

// NOW it is safe to take a screenshot
await expect(page).toHaveScreenshot('my-view.png', { fullPage: true, animations: 'disabled' });
```

### Loading vs Permanent skeleton types

**Wait for these to disappear (actual loading skeletons):**
- `[data-testid="players-skeleton"]`
- `[data-testid="penetration-skeleton"]`
- `[data-testid="damage-done-table-skeleton"]`
- `[data-testid="healing-done-table-skeleton"]`
- `[data-testid="insights-skeleton-layout"]`
- `[data-testid="calculator-skeleton"]`

**Ignore these (permanent UI elements, never disappear):**
- `[data-testid="player-card-loading-fallback"]`
- `[data-testid="skill-tooltip-loading-fallback"]`

The `createSkeletonDetector` automatically distinguishes these — you do not need to filter manually.

### Timeout guidelines

```typescript
// Simple / static pages
await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 15000 });

// Report pages with moderate data
await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 30000 });

// Complex report pages (most common)
await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });

// Heavy computation (damage analysis)
await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 60000 });
```

---

## Part 2 — Data Pre-Loading (for Fast, Stable Visual Tests)

### Why pre-loading matters

Without pre-loading, data loads fresh every test — taking 15–45 seconds with ~50% screenshot stability. Pre-loading caches data before navigation, giving 1–3 second render times and 95%+ screenshot stability.

### Required imports

```typescript
import {
  preloadAllReportData,
  takeScreenshotWithPreloadedData,
  ensureDataPreloadedForScreenshot,
  navigateWithPreloadedData,
  warmCacheForVisualTestSuite,
} from './utils/data-preloader';

import {
  waitForLoadingComplete,
  isDataPreloaded,
  createSkeletonDetector,
} from './utils/skeleton-detector';
```

### Level 1 — Single test pre-loading

```typescript
test('visual test with preloaded data', async ({ page }) => {
  await preloadAllReportData(page, {
    reportCode: 'nbKdDtT4NcZyVrvX',
    fightId: '117',
    tabs: ['players'],
    timeout: 60000,
  });

  await navigateWithPreloadedData(page, '/#/report/nbKdDtT4NcZyVrvX/fight/117/players');
  await takeScreenshotWithPreloadedData(page, 'players-view.png');
});
```

### Level 2 — Suite-level cache warming (preferred for multiple tests)

```typescript
test.describe('Report Visual Tests', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await warmCacheForVisualTestSuite(page, {
      reportCode: 'nbKdDtT4NcZyVrvX',
      tabs: ['overview', 'players', 'damage', 'healing'],
      aggressiveWarmup: true,
    });

    await context.close();
  });

  test('players tab', async ({ page }) => {
    await navigateWithPreloadedData(page, '/#/report/nbKdDtT4NcZyVrvX/fight/117/players');
    await takeScreenshotWithPreloadedData(page, 'players.png');
  });

  test('damage tab', async ({ page }) => {
    await navigateWithPreloadedData(page, '/#/report/nbKdDtT4NcZyVrvX/fight/117/damage');
    await takeScreenshotWithPreloadedData(page, 'damage.png');
  });
});
```

### Level 3 — Adaptive (checks before loading)

```typescript
await ensureDataPreloadedForScreenshot(page, {
  reportCode: 'nbKdDtT4NcZyVrvX',
  tabs: ['players'],
});

await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117/players');
await waitForLoadingComplete(page, { timeout: 10000 }); // short — data is already cached
await expect(page).toHaveScreenshot('adaptive-test.png');
```

### Pre-loading configuration options

```typescript
interface DataPreloadOptions {
  reportCode?: string;        // Default: 'nbKdDtT4NcZyVrvX'
  fightId?: string;           // Default: '117'
  tabs?: string[];            // ['overview', 'players', 'damage', 'healing', 'insights']
  timeout?: number;           // Default: 90000ms
  verifyLoaded?: boolean;     // Default: true
  aggressiveWarmup?: boolean; // Pre-warm GraphQL cache (default: true)
}
```

### ❌ Pre-loading mistakes to avoid

```typescript
// WRONG — slow and flaky
await page.goto('/report/abc/players');
await page.waitForTimeout(30000);

// WRONG — using old long timeouts with pre-loaded data (should be fast now)
await waitForLoadingComplete(page, { timeout: 45000 }); // use 10000 instead

// WRONG — assuming pre-load without verifying
await page.goto('/url');
await expect(page).toHaveScreenshot('assumed.png');
```

---

## Part 3 — Complete Test Patterns

### Pattern A — Simple page screenshot
```typescript
test('visual regression', async ({ page }) => {
  await page.goto('/report/abc123/fight/117/players');
  await expect(page).toHaveTitle(/ESO Log Insights/, { timeout: 30000 });

  const skeletonDetector = createSkeletonDetector(page);
  await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
  await page.waitForTimeout(1000);

  await expect(page).toHaveScreenshot('players-loaded.png', {
    fullPage: true,
    animations: 'disabled',
  });
});
```

### Pattern B — Multi-step navigation
```typescript
test('workflow visual test', async ({ page }) => {
  await page.goto('/report/abc123');
  const skeletonDetector = createSkeletonDetector(page);

  await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
  await expect(page).toHaveScreenshot('report-overview.png');

  await page.click('[data-testid="players-tab"]');
  await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
  await expect(page).toHaveScreenshot('players-view.png');

  await page.click('[data-testid="damage-tab"]');
  await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
  await expect(page).toHaveScreenshot('damage-view.png');
});
```

### Pattern C — Debug screenshot on failure
```typescript
// Before waiting
await page.screenshot({ path: 'debug-before-wait.png', fullPage: true });

const skeletonDetector = createSkeletonDetector(page);
await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });

// After wait
await page.screenshot({ path: 'debug-after-wait.png', fullPage: true });

const remaining = await skeletonDetector.getSkeletonInfo();
if (remaining.hasSkeletons) {
  console.error(`❌ ${remaining.count} skeletons still present:`, remaining.types);
}
```

---

## Part 4 — Defensive vs Strict Validation

Use **both** types for comprehensive coverage. Do NOT write only defensive tests.

### Recommended ratio: ~80% defensive, ~20% strict

| Scenario | Test Type |
|----------|-----------|
| Page loads without crashing | Defensive |
| Responsive layout works | Defensive |
| Navigation doesn't break | Defensive |
| Specific report title appears | Strict |
| Pagination shows correct pages | Strict |
| Empty state triggers | Strict |
| Error messages display | Strict |

### Defensive test example
```typescript
test('report list page structure', async ({ page }) => {
  await page.goto('/latest-reports');
  expect(page.url()).toContain('/latest-reports');

  const table = page.locator('table, [class*="MuiCard"]');
  expect(await table.count()).toBeGreaterThan(0);

  await expect(page.locator('text=/authentication required|access denied/i')).not.toBeVisible();
});
```

### Strict validation test example
```typescript
test('report list displays mocked data', async ({ page }) => {
  const mockData = {
    __typename: 'Report',
    code: 'TEST123',
    title: 'Sunspire Hard Mode Clear',
    zone: { __typename: 'Zone', name: 'Sunspire' },
    owner: { __typename: 'User', name: 'RaidLeader' },
  };

  // Mock at the correct ESO Logs endpoint (NOT /graphql)
  await page.route('**/api/v2/**', async (route) => {
    const postData = route.request().postDataJSON();
    if (postData?.query?.includes('getLatestReports')) {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: { reportData: { reports: { data: [mockData] } } } }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto('/latest-reports');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('text="Sunspire Hard Mode Clear"')).toBeVisible();
  await expect(page.locator('text="Sunspire"')).toBeVisible();
});
```

### Unified auth + mock helper pattern (best practice)
```typescript
async function setupAuth(page: Page, reportMockData?: any) {
  await page.evaluate(() => {
    const token = createMockJWT({ sub: '999', exp: futureTime });
    localStorage.setItem('access_token', token);
  });

  await page.route('**/api/v2/**', async (route) => {
    const postData = route.request().postDataJSON();

    if (postData?.query?.includes('currentUser')) {
      await route.fulfill({ /* mock auth */ });
    } else if (postData?.query?.includes('getLatestReports') && reportMockData) {
      await route.fulfill({
        body: JSON.stringify({ data: { reportData: { reports: reportMockData } } }),
      });
    } else {
      await route.continue();
    }
  });

  await page.reload();
}

// Usage
await setupAuth(page);              // defensive tests
await setupAuth(page, mockData);    // strict tests
```

### GraphQL mocking rules
- ✅ Always include `__typename` fields — Apollo Client rejects responses without them
- ✅ Mock `**/api/v2/**` (actual ESO Logs endpoint), NOT `**/graphql`

---

## Part 5 — Pre-Loading Troubleshooting

### Slow tests despite pre-loading
1. Verify global setup ran — check `localStorage.getItem('access_token')`
2. Check cache warm flags: `window.__DATA_PRELOADED__`, `window.__CACHE_WARMED__`
3. Verify correct report code is being used
4. Check authentication issues preventing cache access

### Skeletons still present after pre-loading
- Data structure may have changed (stale cache)
- Different GraphQL queries than expected
- Some skeletons are permanent UI elements — check `data-testid`

### Expected performance with pre-loading
- Navigation time: **1–3 seconds** (was 15–45 seconds)
- Screenshot stability: **95%+** (was ~50%)
- `waitForLoadingComplete` timeout: **10 seconds** (was 45 seconds)

---

## AI Agent Checklist

Before taking ANY screenshot:

- [ ] Import skeleton detector utilities
- [ ] Create `skeletonDetector` instance
- [ ] Call `waitForSkeletonsToDisappear` with appropriate timeout
- [ ] Add 1-second safety wait for animations
- [ ] Take screenshot with `animations: 'disabled'`
- [ ] For visual test suites: pre-load data with `warmCacheForVisualTestSuite`
- [ ] Include at least one strict validation test per feature
