# 🤖 AI Agent Quick Reference - Playwright Visual Tests

## 🔥 **CRITICAL RULE: NEVER TAKE SCREENSHOTS WITHOUT WAITING FOR SKELETONS TO DISAPPEAR**

### **The One Pattern You Must Always Use:**

```typescript
import { createSkeletonDetector } from './utils/skeleton-detector';

test('any visual test', async ({ page }) => {
  // 1. Navigate
  await page.goto('/your-page');
  
  // 2. MANDATORY: Create skeleton detector and wait
  const skeletonDetector = createSkeletonDetector(page);
  await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
  
  // 3. Safety wait for animations
  await page.waitForTimeout(1000);
  
  // 4. NOW take screenshot
  await expect(page).toHaveScreenshot('your-test.png');
});
```

## ⚡ **Copy-Paste Templates**

### **Full Page Screenshot:**
```typescript
const skeletonDetector = createSkeletonDetector(page);
await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
await page.waitForTimeout(1000);
await expect(page).toHaveScreenshot('full-page.png', { fullPage: true });
```

### **Component Screenshot:**
```typescript
const skeletonDetector = createSkeletonDetector(page);
await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
await page.waitForTimeout(1000);
const component = page.locator('[data-testid="your-component"]');
await expect(component).toHaveScreenshot('component.png');
```

### **Debug When Tests Fail:**
```typescript
// Add this BEFORE taking screenshots to debug issues
const skeletonInfo = await skeletonDetector.getSkeletonInfo();
console.log(`Skeletons remaining: ${skeletonInfo.count}, Types: ${skeletonInfo.types.join(', ')}`);
await page.screenshot({ path: 'debug-state.png', fullPage: true });
```

## 📋 **Required Imports**

Always add this import at the top of test files:
```typescript
import { createSkeletonDetector } from './utils/skeleton-detector';
```

## ⏱️ **Timeout Guidelines**

- **Simple pages:** `timeout: 15000` (15 seconds)
- **Report pages:** `timeout: 30000` (30 seconds) 
- **Complex data pages:** `timeout: 45000` (45 seconds) - **DEFAULT**
- **Heavy computation:** `timeout: 60000` (60 seconds)

## ❌ **Never Do This:**

```typescript
// DON'T: Just wait for network
await page.waitForLoadState('networkidle');
await expect(page).toHaveScreenshot('bad.png'); // ❌ WRONG

// DON'T: Use arbitrary timeouts  
await page.waitForTimeout(5000);
await expect(page).toHaveScreenshot('bad.png'); // ❌ WRONG

// DON'T: Assume DOM loaded = ready
await page.waitForLoadState('domcontentloaded');
await expect(page).toHaveScreenshot('bad.png'); // ❌ WRONG
```

## ✅ **Always Do This:**

```typescript
// ✅ CORRECT: Wait for skeletons to disappear
const skeletonDetector = createSkeletonDetector(page);
await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
await page.waitForTimeout(1000);
await expect(page).toHaveScreenshot('good.png'); // ✅ CORRECT
```

---

**Remember:** Even mocked data takes 15-45 seconds to fully load due to complex React/GraphQL/Redux processing. The skeleton detector handles this complexity automatically - **just use it consistently**.