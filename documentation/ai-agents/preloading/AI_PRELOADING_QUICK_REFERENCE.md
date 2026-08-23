# 🤖 AI Agent Quick Reference - Pre-Loading Edition

## 🚀 **NEW MANDATORY PATTERN FOR ALL VISUAL TESTS**

### **The One Pattern to Rule Them All:**

```typescript
import { preloadAllReportData, takeScreenshotWithPreloadedData } from './utils/data-preloader';
import { waitForLoadingComplete } from './utils/skeleton-detector';

test('any visual test', async ({ page }) => {
  // 1. PRE-LOAD all data first (NEW REQUIREMENT)
  await preloadAllReportData(page, {
    reportCode: 'F4f2bMwWtgVKxjB9',
    tabs: ['players', 'damage'],
    aggressiveWarmup: true,
  });

  // 2. Navigate (will be INSTANT with preloaded data)
  await page.goto('/your-url', { waitUntil: 'domcontentloaded' });

  // 3. Wait for UI (should be FAST - 1-3 seconds)
  await waitForLoadingComplete(page, { timeout: 10000 }); // SHORT timeout!

  // 4. Screenshot (guaranteed to have data)
  await takeScreenshotWithPreloadedData(page, 'your-test.png');
});
```

## ⚡ **Copy-Paste Templates**

### **Test Suite with Cache Warming (BEST PERFORMANCE):**

```typescript
test.describe('My Visual Tests', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await warmCacheForVisualTestSuite(page, {
      reportCode: 'F4f2bMwWtgVKxjB9',
      tabs: ['overview', 'players', 'damage'],
      aggressiveWarmup: true,
    });

    await context.close();
  });

  test('fast screenshot 1', async ({ page }) => {
    await navigateWithPreloadedData(page, '/url1');
    await waitForLoadingComplete(page, { timeout: 8000 });
    await takeScreenshotWithPreloadedData(page, 'test1.png');
  });

  test('fast screenshot 2', async ({ page }) => {
    await navigateWithPreloadedData(page, '/url2');
    await waitForLoadingComplete(page, { timeout: 8000 });
    await takeScreenshotWithPreloadedData(page, 'test2.png');
  });
});
```

### **Single Test with Pre-Loading:**

```typescript
test('single visual test', async ({ page }) => {
  await preloadAllReportData(page, {
    reportCode: 'F4f2bMwWtgVKxjB9',
    tabs: ['players'],
  });

  await navigateWithPreloadedData(page, '/players-url');
  await waitForLoadingComplete(page, { timeout: 10000 });
  await takeScreenshotWithPreloadedData(page, 'players.png');
});
```

### **Adaptive Pre-Loading (When Unsure):**

```typescript
test('adaptive test', async ({ page }) => {
  // Checks if data is already preloaded, preloads if not
  await ensureDataPreloadedForScreenshot(page, {
    reportCode: 'F4f2bMwWtgVKxjB9',
  });

  await page.goto('/url');
  await waitForLoadingComplete(page); // Auto-detects preload status
  await expect(page).toHaveScreenshot('adaptive.png');
});
```

## 📋 **Required Imports**

```typescript
// MANDATORY imports for ALL visual tests
import {
  preloadAllReportData, // Pre-load data before tests
  takeScreenshotWithPreloadedData, // Screenshot with data guarantee
  ensureDataPreloadedForScreenshot, // Smart preload check
  navigateWithPreloadedData, // Navigate expecting instant load
  warmCacheForVisualTestSuite, // One-time cache warming
} from './utils/data-preloader';

import {
  waitForLoadingComplete, // Preload-aware skeleton detection
  isDataPreloaded, // Check preload status
  createSkeletonDetector, // Enhanced skeleton detector
} from './utils/skeleton-detector';
```

## ⏱️ **NEW Timeout Guidelines**

```typescript
// OLD (without pre-loading): Slow and unreliable
await waitForSkeletonsToDisappear({ timeout: 45000 }); // 45 seconds!

// NEW (with pre-loading): Fast and reliable
await waitForLoadingComplete(page, { timeout: 10000 }); // 10 seconds max!
await preloadAllReportData(page, { timeout: 60000 }); // One-time setup
```

## 🎯 **Performance Expectations**

| Metric            | Before Pre-Loading | After Pre-Loading |
| ----------------- | ------------------ | ----------------- |
| **Navigation**    | 15-45 seconds      | 1-3 seconds       |
| **Test Duration** | 60-120 seconds     | 5-15 seconds      |
| **Success Rate**  | 50-70%             | 95%+              |
| **Cache Hits**    | 0%                 | 90%+              |

## 🔍 **Debug When Tests Are Slow**

```typescript
// Check if preloading is working
const isPreloaded = await isDataPreloaded(page);
console.log('Data preloaded:', isPreloaded);

// Time navigation performance
const startTime = Date.now();
await navigateWithPreloadedData(page, '/url', { verifyInstantLoad: true });
const loadTime = Date.now() - startTime;

if (loadTime > 10000) {
  console.warn(`⚠️ Slow load (${loadTime}ms) - cache not working`);
} else {
  console.log(`⚡ Fast load (${loadTime}ms) - cache is effective`);
}

// Check skeleton state
const skeletonInfo = await createSkeletonDetector(page).getSkeletonInfo();
console.log('Skeletons remaining:', skeletonInfo.count, skeletonInfo.types);
```

## 🚨 **Error Patterns to Avoid**

```typescript
// ❌ DON'T: Skip pre-loading
await page.goto('/url');
await page.waitForTimeout(30000);
await expect(page).toHaveScreenshot('bad.png');

// ❌ DON'T: Use old long timeouts with preloaded data
await preloadAllReportData(page);
await waitForLoadingComplete(page, { timeout: 45000 }); // TOO LONG!

// ❌ DON'T: Assume preloading without checking
await page.goto('/url');
await expect(page).toHaveScreenshot('assumed.png'); // Might fail

// ✅ DO: Follow the mandatory pattern
await preloadAllReportData(page);
await navigateWithPreloadedData(page, '/url');
await waitForLoadingComplete(page, { timeout: 10000 });
await takeScreenshotWithPreloadedData(page, 'correct.png');
```

## 📱 **Device/Viewport Patterns**

```typescript
// Mobile
test.use({ ...devices['iPhone 12'] });
test('mobile', async ({ page }) => {
  await preloadAllReportData(page, { tabs: ['overview'] }); // Fewer tabs
  await navigateWithPreloadedData(page, '/url');
  await waitForLoadingComplete(page, { timeout: 8000 });
  await takeScreenshotWithPreloadedData(page, 'mobile.png');
});

// Multiple viewports
VIEWPORTS.forEach((viewport) => {
  test.describe(viewport.name, () => {
    test.use({ viewport });
    test('viewport test', async ({ page }) => {
      await preloadAllReportData(page, { aggressiveWarmup: true });
      // ... rest of test
    });
  });
});
```

## 🔧 **Validation**

```bash
# Validate your tests follow the new patterns
npm run validate:playwright-ai

# Should show:
# ✅ Uses data pre-loading utilities
# ✅ Uses preload-aware loading detection
# ✅ Warms cache for test suite efficiency
```

## 📈 **Success Indicators**

Your tests are working correctly if you see:

- ⚡ **Navigation times < 5 seconds** consistently
- 📊 **Skeleton counts drop to 0-2** quickly
- 🎯 **No timeout failures** on `waitForLoadingComplete`
- 🚀 **Test duration < 20 seconds** per visual test
- ✅ **95%+ success rate** in CI/CD

## 🆘 **When to Ask for Help**

Contact for support if you experience:

- Tests still taking >30 seconds despite pre-loading
- Skeleton counts consistently >10 after preloading
- Cache warming appears to have no effect
- Validation script shows missing pre-loading patterns

---

**Remember**: The goal is **instant rendering from cached data**, not faster loading. Pre-load everything first, then test with confidence!
