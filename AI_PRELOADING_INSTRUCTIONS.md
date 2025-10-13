# 🚀 AI Agent Instructions - Data Pre-Loading for Instant Visual Tests

## 🎯 **CRITICAL: The New Pre-Loading Paradigm**

**PROBLEM SOLVED**: Tests were taking 15-45 seconds because data loaded fresh every time. Now we **pre-load and cache ALL data** before taking screenshots, ensuring **instant UI rendering** and **reliable visual tests**.

## 📋 **MANDATORY Pre-Loading Workflow**

### **🔥 The Golden Rule for AI Agents:**

```typescript
// ✅ ALWAYS follow this pattern for ANY visual test:

import { preloadAllReportData, takeScreenshotWithPreloadedData } from './utils/data-preloader';
import { waitForLoadingComplete } from './utils/skeleton-detector';

// 1. Pre-load ALL data first
await preloadAllReportData(page, {
  reportCode: 'your-report-code',
  tabs: ['overview', 'players', 'damage', 'healing'],
  aggressiveWarmup: true
});

// 2. Navigate with instant rendering expectation
await page.goto('/your-url', { waitUntil: 'domcontentloaded' });

// 3. Wait for loading complete (should be FAST now)
await waitForLoadingComplete(page, { timeout: 10000 }); // Short timeout!

// 4. Take screenshot with pre-loaded data guarantee
await takeScreenshotWithPreloadedData(page, 'your-test.png');
```

## 🏗️ **New Required Imports**

```typescript
// MANDATORY imports for all visual tests
import { 
  preloadAllReportData, 
  takeScreenshotWithPreloadedData,
  ensureDataPreloadedForScreenshot,
  navigateWithPreloadedData,
  warmCacheForVisualTestSuite
} from './utils/data-preloader';

import { 
  waitForLoadingComplete, 
  isDataPreloaded,
  createSkeletonDetector 
} from './utils/skeleton-detector';
```

## 📊 **Three Levels of Data Pre-Loading**

### **Level 1: Single Test Pre-Loading** 
Use this for individual tests:

```typescript
test('visual test with preloaded data', async ({ page }) => {
  // Pre-load data for this specific test
  await preloadAllReportData(page, {
    reportCode: 'nbKdDtT4NcZyVrvX',
    fightId: '117',
    tabs: ['players'], // Only load what you need
    timeout: 60000
  });
  
  // Navigate and screenshot
  await navigateWithPreloadedData(page, '/#/report/nbKdDtT4NcZyVrvX/fight/117/players');
  await takeScreenshotWithPreloadedData(page, 'players-view.png');
});
```

### **Level 2: Test Suite Cache Warming**
Use this for multiple related tests:

```typescript
test.describe('Report Visual Tests', () => {
  // Warm cache ONCE for entire test suite
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await warmCacheForVisualTestSuite(page, {
      reportCode: 'nbKdDtT4NcZyVrvX',
      tabs: ['overview', 'players', 'damage', 'healing'],
      aggressiveWarmup: true
    });
    
    await context.close();
  });

  test('players tab screenshot', async ({ page }) => {
    // Data already cached - should render instantly
    await navigateWithPreloadedData(page, '/#/report/nbKdDtT4NcZyVrvX/fight/117/players');
    await takeScreenshotWithPreloadedData(page, 'players.png');
  });

  test('damage tab screenshot', async ({ page }) => {
    // Data already cached - should render instantly  
    await navigateWithPreloadedData(page, '/#/report/nbKdDtT4NcZyVrvX/fight/117/damage');
    await takeScreenshotWithPreloadedData(page, 'damage.png');
  });
});
```

### **Level 3: Smart Pre-Loading Check**
Use this when you're not sure if data is pre-loaded:

```typescript
test('adaptive visual test', async ({ page }) => {
  // This will pre-load only if needed
  await ensureDataPreloadedForScreenshot(page, {
    reportCode: 'nbKdDtT4NcZyVrvX',
    tabs: ['players']
  });
  
  await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117/players');
  await waitForLoadingComplete(page); // Auto-detects if preloaded
  
  await expect(page).toHaveScreenshot('adaptive-test.png');
});
```

## 🎛️ **Pre-Loading Configuration Options**

```typescript
interface DataPreloadOptions {
  reportCode?: string;           // Report to pre-load (default: 'nbKdDtT4NcZyVrvX')
  fightId?: string;             // Fight to pre-load (default: '117')  
  tabs?: string[];              // Tabs to pre-load ['overview', 'players', 'damage', 'healing', 'insights']
  timeout?: number;             // Pre-loading timeout (default: 90000ms)
  verifyLoaded?: boolean;       // Verify data actually loaded (default: true)
  aggressiveWarmup?: boolean;   // Pre-warm GraphQL cache (default: true)
}

// Examples:
await preloadAllReportData(page, {
  tabs: ['players', 'damage'],     // Only pre-load specific tabs
  aggressiveWarmup: true,          // Warm GraphQL cache aggressively  
  verifyLoaded: true              // Double-check data loaded correctly
});
```

## ⚡ **Expected Performance Improvements**

### **Before Pre-Loading:**
- Initial data load: **15-45 seconds**
- Screenshot stability: **50% success rate**
- Test duration: **60-120 seconds per test**

### **After Pre-Loading:**
- Data already cached: **1-3 seconds to render**
- Screenshot stability: **95%+ success rate**
- Test duration: **5-15 seconds per test**

## 🔍 **Debug Pre-Loading Issues**

### **Check If Data Is Pre-Loaded:**
```typescript
const isPreloaded = await isDataPreloaded(page);
console.log('Data preloaded:', isPreloaded);

if (!isPreloaded) {
  console.log('🔄 Data not preloaded, running preload...');
  await preloadAllReportData(page, { /* options */ });
}
```

### **Verify Cache Effectiveness:**
```typescript
// Time how fast navigation is with cached data
const startTime = Date.now();
await navigateWithPreloadedData(page, '/your-url', { verifyInstantLoad: true });
const loadTime = Date.now() - startTime;

if (loadTime > 10000) {
  console.warn(`⚠️ Slow load (${loadTime}ms) - cache may not be working`);
} else {
  console.log(`⚡ Fast load (${loadTime}ms) - cache is effective`);
}
```

### **Check Skeleton State After Pre-Loading:**
```typescript
const skeletonDetector = createSkeletonDetector(page);
const skeletonInfo = await skeletonDetector.getSkeletonInfo();

console.log('Skeleton count:', skeletonInfo.count);
console.log('Skeleton types:', skeletonInfo.types);

// Should be 0 or very low for preloaded data
if (skeletonInfo.count > 5) {
  console.warn('⚠️ Many skeletons present - data may not be cached properly');
}
```

## 📱 **Device-Specific Pre-Loading**

### **Mobile Device Tests:**
```typescript
test.describe('Mobile Visual Tests', () => {
  test.use({ ...devices['iPhone 12'] });

  test.beforeEach(async ({ page }) => {
    // Pre-load for mobile viewport  
    await preloadAllReportData(page, {
      tabs: ['players'], // Mobile might need fewer tabs
      aggressiveWarmup: true
    });
  });

  test('mobile players view', async ({ page }) => {
    await navigateWithPreloadedData(page, '/players');
    await takeScreenshotWithPreloadedData(page, 'mobile-players.png');
  });
});
```

### **Multi-Viewport Tests:**
```typescript
const VIEWPORTS = [
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1920, height: 1080 }
];

VIEWPORTS.forEach(viewport => {
  test.describe(`${viewport.name} Tests`, () => {
    test.use({ viewport });

    test('visual regression', async ({ page }) => {
      // Pre-load once per viewport
      await preloadAllReportData(page, { 
        tabs: ['overview'],
        aggressiveWarmup: true 
      });
      
      await navigateWithPreloadedData(page, '/overview');
      await takeScreenshotWithPreloadedData(page, `${viewport.name.toLowerCase()}-overview.png`);
    });
  });
});
```

## 🚨 **Common Mistakes to Avoid**

### **❌ DON'T: Skip Pre-Loading**
```typescript
// WRONG - Will be slow and flaky
test('bad test', async ({ page }) => {
  await page.goto('/report/abc/players');
  await page.waitForTimeout(30000); // Arbitrary wait
  await expect(page).toHaveScreenshot('bad.png');
});
```

### **❌ DON'T: Use Old Timeout Values**
```typescript
// WRONG - Using old long timeouts with preloaded data
await waitForLoadingComplete(page, { timeout: 45000 }); // Too long!

// RIGHT - Use short timeouts for preloaded data
await waitForLoadingComplete(page, { timeout: 10000 }); // Should be fast
```

### **❌ DON'T: Forget to Check Pre-Load Status**
```typescript
// WRONG - Assuming data is preloaded without checking
await page.goto('/url');
await expect(page).toHaveScreenshot('assumed.png');

// RIGHT - Verify or ensure preloading
await ensureDataPreloadedForScreenshot(page);
await page.goto('/url');
await expect(page).toHaveScreenshot('verified.png');
```

## 🔧 **Troubleshooting Pre-Loading Issues**

### **Issue: "Data appears not preloaded"**
```typescript
// Debug steps:
1. Check global setup ran: console.log('Auth token:', await page.evaluate(() => localStorage.getItem('access_token')));
2. Verify cache warm flags: console.log('Cache flags:', await page.evaluate(() => ({ 
   preloaded: window.__DATA_PRELOADED__, 
   warmed: window.__CACHE_WARMED__ 
})));
3. Check network requests: Enable network logs to see if API calls are being made
4. Verify report code: Make sure you're using the correct test report code
```

### **Issue: "Tests still slow despite pre-loading"**
```typescript
// Possible causes:
1. Pre-loading didn't run in global setup
2. Cache was cleared between tests  
3. Wrong report code being used
4. Authentication issues preventing cache access
5. Network interception not working

// Debug with timing:
const startTime = Date.now();
await preloadAllReportData(page, { reportCode: 'correct-code' });
const preloadTime = Date.now() - startTime;
console.log(`Pre-loading took: ${preloadTime}ms`);
```

### **Issue: "Skeletons still present after pre-loading"**
```typescript
// This can happen if:
1. Data structure changed and cache is stale
2. Different GraphQL queries than expected  
3. Authentication state issues
4. UI components have permanent skeletons (not loading indicators)

// Debug:
const skeletonInfo = await createSkeletonDetector(page).getSkeletonInfo();
console.log('Remaining skeletons:', skeletonInfo.types);
// Look for permanent UI elements vs actual loading indicators
```

## 🎯 **Success Metrics**

### **Your Tests Should Now Achieve:**
- ⚡ **Sub-10-second test duration** for most visual tests
- 📸 **95%+ screenshot consistency** across runs  
- 🚀 **1-3 second navigation times** with preloaded data
- 🎯 **Zero timeout failures** due to slow data loading
- 🔄 **Reliable test execution** in CI/CD pipelines

### **Warning Signs of Pre-Loading Issues:**
- 🐌 Tests taking >20 seconds consistently
- 📊 Multiple skeleton types persisting after navigation
- 🔄 API requests being made during navigation (should be cached)
- ⏰ Timeout errors on `waitForLoadingComplete`

## 🚀 **Next Steps for AI Agents**

1. **Always use the pre-loading utilities** - Don't write visual tests without them
2. **Start with test suite cache warming** - Pre-load once, test multiple times  
3. **Use debug tools** when tests are slow or flaky
4. **Monitor performance** - Tests should be consistently fast now
5. **Report issues** if pre-loading doesn't work as expected

**Remember**: The goal is **instant UI rendering** from cached data, not optimizing loading times. Pre-load everything first, then take screenshots with confidence!