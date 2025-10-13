import { test, expect } from '@playwright/test';

test('debug skeleton selector', async ({ page }) => {
  // Navigate to the main page
  await page.goto('http://localhost:3001/#/app/reports/nbKdDtT4NcZyVrvX/117');
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  console.log('=== Debugging Skeleton Selectors ===');
  
  // Test different selectors individually
  const selectors = [
    '[data-testid*="skeleton"]',
    '[data-testid*="loading"]', 
    '.MuiSkeleton-root'
  ];
  
  for (const selector of selectors) {
    const count = await page.locator(selector).count();
    console.log(`Selector "${selector}": ${count} elements`);
    
    if (count > 0 && count < 20) {
      // If there are few elements, show their test IDs
      const elements = await page.locator(selector).all();
      for (let i = 0; i < Math.min(elements.length, 10); i++) {
        const testId = await elements[i].getAttribute('data-testid');
        const className = await elements[i].getAttribute('class');
        const tagName = await elements[i].evaluate(el => el.tagName);
        console.log(`  Element ${i + 1}: testId="${testId}", class="${className}", tag="${tagName}"`);
      }
    }
  }
  
  // Test the combined selector
  const combinedSelector = '[data-testid*="skeleton"], [data-testid*="loading"], .MuiSkeleton-root';
  const totalCount = await page.locator(combinedSelector).count();
  console.log(`Combined selector: ${totalCount} elements`);
  
  // Check specifically for elements that should disappear vs persistent ones
  const persistentElements = await page.locator('[data-testid*="loading"]:not([data-testid*="skeleton"])').count();
  console.log(`Persistent loading elements: ${persistentElements}`);
});