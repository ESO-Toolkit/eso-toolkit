# AI Agent Instructions for Playwright Visual Testing - ESO Log Aggregator

## 🎯 Critical Problem Context

The ESO Log Aggregator has **sophisticated data loading states** with multiple skeleton UI components that must completely disappear before taking screenshots. **Mocked data still takes significant time to load** due to complex React rendering, GraphQL client hydration, and Redux state updates.

## 🚨 Common AI Agent Mistakes to Avoid

### ❌ **DON'T: Use Simple Timeout Waits**
```typescript
// WRONG - Unreliable and slow
await page.waitForTimeout(5000); // May be too short or too long
await page.screenshot(); // Screenshot may still contain skeletons
```

### ❌ **DON'T: Only Wait for Network Idle**
```typescript
// WRONG - Network idle doesn't mean UI is ready
await page.waitForLoadState('networkidle');
await page.screenshot(); // React is still rendering/hydrating
```

### ❌ **DON'T: Assume DOM Content Loaded = Ready**
```typescript
// WRONG - DOM loaded but skeletons still visible
await page.waitForLoadState('domcontentloaded');
await page.screenshot(); // Skeletons still animating
```

## ✅ **MANDATORY: Use the Skeleton Detection System**

This project has a **purpose-built skeleton detection utility** that you MUST use:

### **1. Import the Skeleton Detector**
```typescript
import { createSkeletonDetector, skeletonHelpers, SKELETON_SELECTORS } from './utils/skeleton-detector';
```

### **2. Always Wait for Skeletons to Disappear Before Screenshots**
```typescript
// ✅ CORRECT PATTERN
async function takeScreenshotWhenReady(page: Page, testInfo: TestInfo) {
  console.log('🔍 Checking for loading skeletons...');
  
  // Create skeleton detector
  const skeletonDetector = createSkeletonDetector(page);
  
  // Check initial state
  const initialSkeletonInfo = await skeletonDetector.getSkeletonInfo();
  console.log('Initial skeleton count:', initialSkeletonInfo.count);
  
  if (initialSkeletonInfo.hasSkeletons) {
    console.log(`⏳ Waiting for ${initialSkeletonInfo.count} skeletons to disappear...`);
    
    // CRITICAL: Wait for ALL skeletons to disappear
    await skeletonDetector.waitForSkeletonsToDisappear({ 
      timeout: 45000, // Generous timeout for complex data loading
      recheckInterval: 500 // Check every 500ms
    });
    
    console.log('✅ All skeletons have disappeared - UI is ready');
  } else {
    console.log('✅ No skeletons detected - UI appears ready');
  }
  
  // Additional safety wait for animations to settle
  await page.waitForTimeout(1000);
  
  // NOW it's safe to take screenshot
  const screenshot = await page.screenshot({ fullPage: true });
  
  // Verify final state has no skeletons
  const finalSkeletonInfo = await skeletonDetector.getSkeletonInfo();
  if (finalSkeletonInfo.hasSkeletons) {
    console.warn(`⚠️ Warning: ${finalSkeletonInfo.count} skeletons still present after wait`);
  }
  
  return screenshot;
}
```

### **3. Understanding Skeleton Types in This Project**

The ESO Log Aggregator has **different types of skeleton components**:

#### **Loading Skeletons (MUST disappear before screenshots):**
- `[data-testid="players-skeleton"]` - Player data loading
- `[data-testid="penetration-skeleton"]` - Combat penetration analysis
- `[data-testid="damage-done-table-skeleton"]` - Damage tables
- `[data-testid="healing-done-table-skeleton"]` - Healing tables
- `[data-testid="insights-skeleton-layout"]` - Main insights layout
- `[data-testid="calculator-skeleton"]` - Calculator components

#### **Permanent UI Elements (DON'T wait for these):**
- `[data-testid="player-card-loading-fallback"]` - Permanent placeholder
- `[data-testid="skill-tooltip-loading-fallback"]` - Tooltip placeholder
- Non-animated MUI skeletons used for layout

#### **The Detection System Handles This Automatically**
```typescript
// The skeleton detector ONLY waits for actual loading skeletons
// It ignores permanent UI elements automatically
const skeletonDetector = createSkeletonDetector(page);
await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
```

## 🛠️ **Complete Test Pattern Examples**

### **Pattern A: Simple Page Screenshot**
```typescript
test('visual regression test', async ({ page }) => {
  // Navigate to page
  await page.goto('/report/abc123/fight/117/players');
  
  // Wait for page title (basic navigation check)
  await expect(page).toHaveTitle(/ESO Log Insights/, { timeout: 30000 });
  
  // CRITICAL: Wait for skeletons to disappear
  const skeletonDetector = createSkeletonDetector(page);
  await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
  
  // Additional safety wait
  await page.waitForTimeout(1000);
  
  // Screenshot is now safe to take
  await expect(page).toHaveScreenshot('players-loaded.png', {
    fullPage: true,
    animations: 'disabled'
  });
});
```

### **Pattern B: Component-Specific Screenshot**
```typescript
test('players panel visual test', async ({ page }) => {
  await page.goto('/report/abc123/fight/117/players');
  
  // Wait for specific content to load
  const skeletonDetector = createSkeletonDetector(page);
  await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
  
  // Wait for specific player content
  await expect(page.locator('[data-testid^="player-card-"]').first()).toBeVisible({ timeout: 15000 });
  
  // Screenshot specific component
  const playersPanel = page.locator('[data-testid="players-panel-view"]');
  await expect(playersPanel).toHaveScreenshot('players-panel.png');
});
```

### **Pattern C: Multiple Page States**
```typescript
test('workflow visual test', async ({ page }) => {
  await page.goto('/report/abc123');
  
  // Step 1: Wait for report overview
  const skeletonDetector = createSkeletonDetector(page);
  await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
  await expect(page).toHaveScreenshot('report-overview.png');
  
  // Step 2: Navigate to players tab
  await page.click('[data-testid="players-tab"]');
  
  // Step 3: Wait for players data to load
  await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
  await expect(page).toHaveScreenshot('players-view.png');
  
  // Step 4: Navigate to damage tab
  await page.click('[data-testid="damage-tab"]');
  
  // Step 5: Wait for damage data to load
  await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
  await expect(page).toHaveScreenshot('damage-view.png');
});
```

## ⚙️ **Configuration and Timing Guidelines**

### **Timeout Values by Complexity:**
```typescript
// Simple pages (calculator, static content)
await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 15000 });

// Report pages with moderate data
await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 30000 });

// Complex report pages with multiple datasets
await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });

// Heavy computational pages (damage analysis)
await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 60000 });
```

### **Safety Waits After Skeleton Disappearance:**
```typescript
// After skeletons disappear, allow animations to settle
await page.waitForTimeout(1000); // Standard
await page.waitForTimeout(2000); // For complex animations
```

## 🐛 **Debugging When Tests Fail**

### **1. Check What Skeletons Are Still Present**
```typescript
const skeletonDetector = createSkeletonDetector(page);
const skeletonInfo = await skeletonDetector.getSkeletonInfo();

console.log('Skeleton count:', skeletonInfo.count);
console.log('Skeleton types:', skeletonInfo.types);

// Get detailed info about visible skeletons
const visibleSkeletons = await skeletonDetector.getVisibleSkeletons();
for (let i = 0; i < visibleSkeletons.length; i++) {
  const testId = await visibleSkeletons[i].getAttribute('data-testid');
  console.log(`Skeleton ${i}: ${testId}`);
}
```

### **2. Take Debug Screenshots**
```typescript
// Before waiting
await page.screenshot({ path: 'debug-before-wait.png', fullPage: true });

// After waiting but before main screenshot
await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
await page.screenshot({ path: 'debug-after-wait.png', fullPage: true });

// Check if skeletons are still present
const remainingSkeletons = await skeletonDetector.getSkeletonInfo();
if (remainingSkeletons.hasSkeletons) {
  console.error(`❌ ${remainingSkeletons.count} skeletons still present!`);
}
```

### **3. Verify Actual Content Loaded**
```typescript
// Check for actual player content, not just absence of skeletons
const playerCards = page.locator('[data-testid^="player-card-"]');
const playerCount = await playerCards.count();
console.log(`Found ${playerCount} player cards`);

if (playerCount === 0) {
  console.warn('⚠️ No player cards found - data may not have loaded');
}
```

## 📋 **AI Agent Checklist**

Before taking ANY screenshot in a Playwright test:

- [ ] ✅ **Navigate to page** with appropriate timeout
- [ ] ✅ **Import skeleton detector** utilities
- [ ] ✅ **Create skeleton detector** instance
- [ ] ✅ **Check initial skeleton state** (optional but helpful for debugging)
- [ ] ✅ **Wait for skeletons to disappear** with generous timeout (30-60s)
- [ ] ✅ **Add 1-2 second safety wait** for animations
- [ ] ✅ **Verify no skeletons remain** (optional but recommended)
- [ ] ✅ **Take screenshot** with appropriate options
- [ ] ✅ **Handle errors gracefully** with debug output

## 🚀 **Performance Optimization Notes**

### **Why Mocked Data Still Takes Time:**
1. **GraphQL Client Hydration** - Apollo Client needs time to process cached responses
2. **Redux State Updates** - Complex state updates with selectors and derived data  
3. **React Rendering Cycles** - Multiple render passes for complex component trees
4. **CSS-in-JS Processing** - Emotion/MUI theme calculations
5. **Chart.js Initialization** - Data visualization rendering
6. **3D Scene Setup** - React Three Fiber scene construction

### **This is Normal and Expected:**
- Even with mocked data, **15-45 seconds** loading time is typical for complex pages
- The skeleton detection system accounts for this reality
- **Don't try to optimize away the wait time** - embrace it with proper detection

## 📞 **When to Ask for Help**

If tests are consistently failing after following this guide:

1. **Check that skeleton detector is imported correctly**
2. **Verify timeout values are sufficient** (try increasing to 60-90 seconds)
3. **Look at debug screenshots** to see what's actually happening
4. **Check console output** for skeleton detection logs
5. **Verify the page URL** is correct and accessible
6. **Check if authentication is needed** for the page being tested

Remember: **The skeleton detection system is your friend** - trust it and use it consistently for reliable visual tests.