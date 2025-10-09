import { test, expect, devices } from '@playwright/test';

test.describe('Responsive Layout Tests', () => {
  const testReportId = '98b3845e3c1ed2a6191e-67039068743d5eeb2855';
  const testUrl = `/r/${testReportId}`;

  test('should not have horizontal overflow on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');

    // Check for horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance
  });

  test('should display properly on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');

    // Basic checks that page loads properly on tablet
    await expect(page.locator('body')).toBeVisible();

    // Check that content is not overflowing
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('should display properly on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');

    // Basic checks that page loads properly on desktop
    await expect(page.locator('body')).toBeVisible();

    // Check that content is not overflowing
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('should handle responsive fight card layout', async ({ page }) => {
    // Test on multiple viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(testUrl);
      await page.waitForLoadState('networkidle');

      // Check that page loads without errors on this viewport
      await expect(page.locator('body')).toBeVisible();

      // Check for horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      const hasOverflow = bodyWidth > viewportWidth + 1;

      if (hasOverflow) {
        console.error(`Horizontal overflow detected on ${viewport.name} viewport: ${bodyWidth}px vs ${viewportWidth}px`);
      }

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

      // Give a brief moment between viewport changes
      await page.waitForTimeout(100);
    }
  });

  test('should load within reasonable time on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const startTime = Date.now();
    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load within reasonable time on mobile (adjust threshold as needed)
    expect(loadTime).toBeLessThan(10000); // 10 seconds (more lenient for development)
  });
});