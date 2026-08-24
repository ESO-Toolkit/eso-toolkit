# Visual Regression Test Patterns

This document provides guidelines for writing Playwright visual regression tests in the ESO Toolkit project.

## ✅ Correct Pattern: Skeleton Detection

Always use skeleton detection when writing visual regression tests. This ensures screenshots are taken only after data has fully loaded and the UI is stable.

### Template Example

```typescript
import { test, expect } from '@playwright/test';
import { createSkeletonDetector } from './utils/skeleton-detector';

test('should take full page screenshot after skeletons disappear', async ({ page }) => {
  console.log('🔍 Starting visual test with skeleton detection...');

  // Step 1: Navigate to page
  await page.goto('/report/F4f2bMwWtgVKxjB9/fight/5/players');

  // Step 2: Wait for basic page load (title check)
  await expect(page).toHaveTitle(/ESO Toolkit/, { timeout: 30000 });

  // Step 3: CRITICAL - Create skeleton detector and wait for skeletons to disappear
  console.log('⏳ Waiting for loading skeletons to disappear...');
  const skeletonDetector = createSkeletonDetector(page);

  // Wait for ALL skeletons to disappear
  await skeletonDetector.waitForSkeletonsToDisappear({
    timeout: 45000, // Generous timeout for complex data loading
    stabilityTimeout: 1000, // Wait 1s after skeletons disappear for stability
  });

  console.log('✅ All skeletons have disappeared - UI is ready');

  // Step 4: Safety wait for animations to settle
  await page.waitForTimeout(1000);

  // Step 5: NOW it's safe to take the screenshot
  await expect(page).toHaveScreenshot('players-page-full.png', {
    fullPage: true,
    animations: 'disabled',
  });

  console.log('📸 Screenshot captured successfully');
});
```

### Key Points

1. **Always import `createSkeletonDetector`** from `./utils/skeleton-detector`
2. **Always wait for skeletons to disappear** before taking screenshots
3. **Use generous timeouts** (45s) for complex pages with data loading
4. **Add safety waits** (1s) for animations to settle after skeletons disappear
5. **Disable animations** in screenshot options for consistency

### Component-Specific Screenshots

```typescript
test('should take component screenshot after content loads', async ({ page }) => {
  await page.goto('/report/F4f2bMwWtgVKxjB9/fight/5/damage');

  // Wait for skeletons to disappear
  const skeletonDetector = createSkeletonDetector(page);
  await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });

  // Wait for specific content to be visible
  const damageTable = page.locator('[data-testid="damage-done-table"]');
  await expect(damageTable).toBeVisible({ timeout: 15000 });

  // Safety wait
  await page.waitForTimeout(1000);

  // Screenshot specific component
  await expect(damageTable).toHaveScreenshot('damage-table.png');
});
```

### Debugging Pattern

When tests fail due to persistent skeletons:

```typescript
test('should demonstrate debugging when skeletons persist', async ({ page }) => {
  await page.goto('/calculator');

  const skeletonDetector = createSkeletonDetector(page);

  // Take debug screenshot BEFORE waiting
  await page.screenshot({ path: 'debug-before-wait.png', fullPage: true });

  try {
    await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 15000 });
  } catch (error) {
    // If skeletons persist, get detailed debugging info
    console.log('🐛 Debugging skeleton persistence...');

    const skeletonInfo = await skeletonDetector.getSkeletonInfo();
    console.log(`Remaining skeleton count: ${skeletonInfo.count}`);
    console.log(`Skeleton types: ${skeletonInfo.types.join(', ')}`);

    // Take debug screenshot showing current state
    await page.screenshot({ path: 'debug-skeleton-persist.png', fullPage: true });

    // Get details about each remaining skeleton
    const visibleSkeletons = await skeletonDetector.getVisibleSkeletons();
    for (let i = 0; i < Math.min(visibleSkeletons.length, 5); i++) {
      const testId = await visibleSkeletons[i].getAttribute('data-testid');
      console.log(`Skeleton ${i}: ${testId}`);
    }

    throw error;
  }

  await page.waitForTimeout(1000);
  await expect(page).toHaveScreenshot('calculator-loaded.png');
});
```

---

## ❌ Anti-Patterns: What NOT to Do

These patterns will cause flaky, unreliable visual tests. **DO NOT USE THESE APPROACHES.**

### ❌ WRONG: Using Arbitrary Timeout Without Skeleton Detection

**Problem:** Waiting a fixed amount of time is unreliable. The page might load faster or slower depending on network conditions, system performance, or data complexity.

```typescript
// ❌ BAD: Don't do this!
test('WRONG: Using arbitrary timeout without skeleton detection', async ({ page }) => {
  await page.goto('/report/abc123/fight/117/players');

  // ❌ BAD: Just waiting arbitrary time
  await page.waitForTimeout(5000); // Could be too short or too long

  // ❌ This screenshot may contain loading skeletons
  await expect(page).toHaveScreenshot('bad-example.png');
});
```

**Why it fails:**

- 5 seconds might be too short if the network is slow
- 5 seconds might be unnecessarily long if the page loads quickly
- No guarantee that React has finished rendering
- Loading skeletons may still be visible
- Results in flaky tests that pass/fail randomly

### ❌ WRONG: Only Waiting for Network Idle

**Problem:** Network idle doesn't mean React has finished rendering. The page may have loaded all data but still be processing it and showing loading skeletons.

```typescript
// ❌ BAD: Don't do this!
test('WRONG: Only waiting for network idle', async ({ page }) => {
  await page.goto('/report/abc123/fight/117/players');

  // ❌ BAD: Network idle doesn't mean React has finished rendering
  await page.waitForLoadState('networkidle');

  // ❌ This screenshot may contain loading skeletons
  await expect(page).toHaveScreenshot('bad-example-2.png');
});
```

**Why it fails:**

- Network requests may complete before React finishes rendering
- State updates and component renders happen asynchronously
- Loading skeletons may still be displayed while data is being processed
- No guarantee of visual stability

### ❌ WRONG: Using DOM Content Loaded as Ready Indicator

**Problem:** DOM content loaded fires when the HTML is parsed, long before data is fetched and rendered. This is the earliest and least reliable indicator.

```typescript
// ❌ BAD: Don't do this!
test('WRONG: Using DOM content loaded as ready indicator', async ({ page }) => {
  await page.goto('/report/abc123/fight/117/players');

  // ❌ BAD: DOM loaded but data is still loading
  await page.waitForLoadState('domcontentloaded');

  // ❌ This screenshot will definitely contain loading skeletons
  await expect(page).toHaveScreenshot('bad-example-3.png');
});
```

**Why it fails:**

- Fires immediately when HTML is parsed
- No data fetching has happened yet
- React hasn't started rendering data
- Page will definitely show loading skeletons
- Guaranteed to produce inconsistent screenshots

---

## Summary

| Approach              | Reliable? | Use Case                              |
| --------------------- | --------- | ------------------------------------- |
| ✅ Skeleton detection | **Yes**   | Always use for visual tests           |
| ❌ Arbitrary timeout  | **No**    | Never use - unreliable timing         |
| ❌ Network idle       | **No**    | Insufficient - React may still render |
| ❌ DOM content loaded | **No**    | Too early - data not loaded yet       |

**Golden Rule:** Always use `createSkeletonDetector()` and `waitForSkeletonsToDisappear()` for visual regression tests. No exceptions.

## See Also

- [`visual-template-correct.spec.ts`](./visual-template-correct.spec.ts) - Working examples
- [`utils/skeleton-detector.ts`](./utils/skeleton-detector.ts) - Skeleton detection implementation
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
