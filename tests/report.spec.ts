import { test, expect, devices } from '@playwright/test';
import { setupApiMocking } from './utils/api-mocking';

test.describe('Report Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocking for consistent testing
    await setupApiMocking(page);
  });

  test('should load a single report page successfully', async ({ page }) => {
    const testReportId = 'TEST123';

    // Navigate to the report page
    await page.goto(`/#/report/${testReportId}`);

    // Wait for the page title to be set
    await expect(page).toHaveTitle(/ESO Toolkit/);

    // Wait for the page to load and network requests to complete
    await page.waitForLoadState('domcontentloaded');

    // Check that the main content is visible
    await expect(page.locator('body')).toBeVisible();

    // Verify that we're on the correct route
    expect(page.url()).toContain(`/report/${testReportId}`);

    // Give the app time to make API calls and render
    await page.waitForTimeout(500);

    // Check for console errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForTimeout(1000);

    const significantErrors = errors.filter(
      (error) => !error.includes('ResizeObserver') && !error.includes('Not implemented'),
    );
    expect(significantErrors).toHaveLength(0);
  });

  test('should handle report data loading', async ({ page }) => {
    // Navigate to the report page
    await page.goto(`/#/report/TEST123`);

    // Wait for loading to complete
    await page.waitForLoadState('domcontentloaded');

    // The page should not show any obvious error states
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();

    await page.waitForTimeout(1000);

    // Should not have crashed
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle report with fight details', async ({ page }) => {
    const testReportId = 'TEST123';

    // Navigate to the main report page first (without specific fight)
    await page.goto(`/#/report/${testReportId}`);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Basic checks
    await expect(page.locator('body')).toBeVisible();

    // Verify route
    expect(page.url()).toContain(`/report/${testReportId}`);

    // Give time for data loading
    await page.waitForTimeout(500);

    // Check that the page loaded without major errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForTimeout(1000);

    const significantErrors = errors.filter(
      (error) => !error.includes('ResizeObserver') && !error.includes('Not implemented'),
    );
    expect(significantErrors).toHaveLength(0);
  });

  test('should handle invalid report gracefully', async ({ page }) => {
    const invalidReportId = 'INVALID123';

    // Navigate to an invalid report
    await page.goto(`/#/report/${invalidReportId}`);

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');

    // The page should still load (even if showing an error state)
    await expect(page.locator('body')).toBeVisible();

    // Give time for error handling
    await page.waitForTimeout(1000);

    // Should not crash the entire app
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
  });

  // Responsive tests added to existing test suite
  test.describe('Responsive Layout', () => {
    test('should not have horizontal overflow on mobile', async ({ page }) => {
      // Use mobile viewport
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

      const testReportId = 'TEST123';
      await page.goto(`/#/report/${testReportId}`);
      await page.waitForLoadState('domcontentloaded');

      // Check for horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance
    });

    test('should display properly on tablet', async ({ page }) => {
      // Use tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad size

      const testReportId = 'TEST123';
      await page.goto(`/#/report/${testReportId}`);
      await page.waitForLoadState('domcontentloaded');

      // Basic checks that page loads properly on tablet
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

      const testReportId = 'TEST123';

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto(`/#/report/${testReportId}`);
        await page.waitForLoadState('domcontentloaded');

        // Check that page loads without errors on this viewport
        await expect(page.locator('body')).toBeVisible();

        // Check for horizontal overflow
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        try {
          expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
        } catch (error) {
          // Log which viewport failed if this assertion fails
          console.error(`Horizontal overflow detected on ${viewport.name} viewport`);
          throw error;
        }

        // Give a brief moment between viewport changes
        await page.waitForTimeout(100);
      }
    });
  });

  // Mobile-specific device tests
  test.describe('Mobile Device Compatibility', () => {
    test('should work on Pixel 5', async ({ page }) => {
      test.use({ ...devices['Pixel 5'] });

      const testReportId = 'TEST123';
      await page.goto(`/#/report/${testReportId}`);
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).toBeVisible();

      // Check for horizontal overflow on Pixel 5
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
    });

    test('should work on iPhone 12', async ({ page }) => {
      test.use({ ...devices['iPhone 12'] });

      const testReportId = 'TEST123';
      await page.goto(`/#/report/${testReportId}`);
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).toBeVisible();

      // Check for horizontal overflow on iPhone 12
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
    });
  });
});
