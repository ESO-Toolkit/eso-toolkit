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

## 🎭 **Testing Philosophy: Defensive + Strict**

### **Use BOTH Test Types for Comprehensive Coverage**

#### **Defensive Tests (80%)** - "Does it crash?"
```typescript
// ✅ Fast, reliable - verifies structure exists
test('report list page structure', async ({ page }) => {
  await page.goto('/latest-reports');
  
  // Check structure exists, not specific data
  const table = page.locator('table, [class*="MuiCard"]');
  expect(await table.count()).toBeGreaterThan(0);
  
  // Verify no auth errors
  const authError = page.locator('text=/authentication required/i');
  await expect(authError).not.toBeVisible();
});
```

#### **Strict Tests (20%)** - "Does data render correctly?"
```typescript
// ✅ Validates mocked data actually appears
test('report list displays mocked data', async ({ page }) => {
  // Mock with __typename fields for Apollo Client
  const mockData = {
    __typename: 'Report',
    title: 'Sunspire Hard Mode Clear',
    zone: { __typename: 'Zone', name: 'Sunspire' }
  };
  
  await page.route('**/api/v2/**', async (route) => {
    // Mock GraphQL response with specific data
    if (route.request().postDataJSON()?.query?.includes('getLatestReports')) {
      await route.fulfill({
        body: JSON.stringify({ data: { reportData: { reports: mockData } } })
      });
    }
  });
  
  await page.goto('/latest-reports');
  
  // STRICT: Verify specific mocked data appears
  await expect(page.locator('text="Sunspire Hard Mode Clear"')).toBeVisible();
});
```

### **Key Takeaways:**
- **Defensive tests** catch crashes and structure issues (fast, reliable)
- **Strict tests** catch data bugs like query changes or mapping errors (slower, thorough)
- Always include GraphQL `__typename` fields in mock data
- Use correct API endpoint pattern: `**/api/v2/**` (not `**/graphql`)
- Create unified mocking helpers that handle auth + data together

---

**Remember:** Even mocked data takes 15-45 seconds to fully load due to complex React/GraphQL/Redux processing. The skeleton detector handles this complexity automatically - **just use it consistently**.
