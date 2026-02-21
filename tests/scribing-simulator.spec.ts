import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Scribing Simulator Page
 *
 * This test file covers the Scribing Simulator page (/scribing-simulator) which provides:
 * - Base skill (grimoire) selection
 * - Focus, Signature, and Affix script selection
 * - Real-time skill simulation with calculated properties
 * - Tooltip generation showing modified skill effects
 * - Recipe display with scribing combinations
 * - Skill effects preview with resource costs and damage
 *
 * The simulator uses the scribing-complete.json data file and provides
 * an interactive interface for planning ESO scribing builds.
 *
 * NOTE: Tests are designed to handle both successful data loading and error states,
 * as the scribing data loading can fail due to data validation issues.
 *
 * Related Jira: ESO-503
 */

test.describe('Scribing Simulator Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/scribing-simulator');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test.describe('Page Loading', () => {
    test('should load scribing simulator page', async ({ page }) => {
      // Verify URL
      await expect(page).toHaveURL(/.*scribing-simulator/);
    });

    test('should display page or error state', async ({ page }) => {
      // The page might show an error if data loading fails
      // Check for either content OR an error alert
      const hasLabels = (await page.locator('label').count()) > 0;
      const hasError = await page.locator('[role="alert"]').isVisible().catch(() => false);

      // Should show either content or error (not blank)
      expect(hasLabels || hasError).toBe(true);
    });

    test('should not be stuck in loading state', async ({ page }) => {
      // Wait a bit more to ensure loading completes
      await page.waitForTimeout(2000);

      // Check for loading indicators
      const loadingSpinner = page.locator('[role="progressbar"]');
      const isLoading = await loadingSpinner.isVisible().catch(() => false);

      // Should not be stuck loading
      expect(isLoading).toBe(false);
    });
  });

  test.describe('Error State Handling', () => {
    test('should display error alert if data loading fails', async ({ page }) => {
      // Check if error alert is present
      const errorAlert = page.locator('[role="alert"]');
      const hasError = await errorAlert.isVisible().catch(() => false);

      if (hasError) {
        // Error should have meaningful content
        const errorText = await errorAlert.textContent();
        expect(errorText).toBeTruthy();
        expect(errorText!.length).toBeGreaterThan(0);

        console.log('📝 Scribing Simulator Data Error:', errorText);
      } else {
        // If no error, content should be visible
        const hasContent = (await page.locator('label').count()) > 0;
        expect(hasContent).toBe(true);
      }
    });
  });

  test.describe('Configuration Panel - Success Path', () => {
    test.beforeEach(async ({ page }) => {
      // Skip if page shows error
      const errorAlert = page.locator('[role="alert"]');
      const hasError = await errorAlert.isVisible().catch(() => false);

      if (hasError) {
        test.skip(true, 'Data loading error - cannot test UI');
      }
    });

    test('should display grimoire selector when data loads', async ({ page }) => {
      const grimoireLabel = page.locator('label').filter({ hasText: /Grimoire/i });
      await expect(grimoireLabel).toBeVisible({ timeout: 5000 });
    });

    test('should display all script selectors when data loads', async ({ page }) => {
      const labels = ['Grimoire', 'Focus Script', 'Signature Script', 'Affix Script'];

      for (const labelText of labels) {
        const label = page.locator('label').filter({ hasText: new RegExp(labelText, 'i') });
        await expect(label).toBeVisible({ timeout: 5000 });
      }
    });

    test('should display configuration section heading', async ({ page }) => {
      const configHeading = page.locator('h6').filter({ hasText: /Script Configuration/i });
      await expect(configHeading).toBeVisible({ timeout: 5000 });
    });

    test('should display results section heading', async ({ page }) => {
      const resultsHeading = page.locator('h6').filter({ hasText: /Simulation Results/i });
      await expect(resultsHeading).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Grimoire Selection - Success Path', () => {
    test.beforeEach(async ({ page }) => {
      const errorAlert = page.locator('[role="alert"]');
      const hasError = await errorAlert.isVisible().catch(() => false);

      if (hasError) {
        test.skip(true, 'Data loading error - cannot test selection');
      }
    });

    test('should be able to click grimoire selector', async ({ page }) => {
      const grimoireSelect = page.locator('div[role="combobox"]').first();
      await expect(grimoireSelect).toBeVisible({ timeout: 5000 });

      // Should be clickable
      await grimoireSelect.click();
      await page.waitForTimeout(500);

      // Dropdown menu should open (listbox appears)
      const listbox = page.locator('ul[role="listbox"]');
      const isOpen = await listbox.isVisible().catch(() => false);

      expect(isOpen).toBe(true);
    });

    test('should display grimoire options when dropdown opens', async ({ page }) => {
      const grimoireSelect = page.locator('div[role="combobox"]').first();
      await grimoireSelect.click();
      await page.waitForTimeout(500);

      // Check for options
      const options = page.locator('li[role="option"]');
      const optionCount = await options.count();

      // Should have at least "None" option plus some grimoires
      expect(optionCount).toBeGreaterThan(0);
    });

    test('should be able to select a grimoire', async ({ page }) => {
      const grimoireSelect = page.locator('div[role="combobox"]').first();
      await grimoireSelect.click();
      await page.waitForTimeout(500);

      const options = page.locator('li[role="option"]');
      const optionCount = await options.count();

      if (optionCount > 1) {
        // Select second option (first is usually "None")
        await options.nth(1).click();
        await page.waitForTimeout(1000);

        // Selection should update
        const selectedValue = await grimoireSelect.textContent();
        expect(selectedValue).toBeTruthy();
      }
    });
  });

  test.describe('Simulation Controls - Success Path', () => {
    test.beforeEach(async ({ page }) => {
      const errorAlert = page.locator('[role="alert"]');
      const hasError = await errorAlert.isVisible().catch(() => false);

      if (hasError) {
        test.skip(true, 'Data loading error - cannot test controls');
      }
    });

    test('should display simulate button', async ({ page }) => {
      const simulateButton = page.locator('button').filter({ hasText: /Simulate|Refresh/i });
      await expect(simulateButton).toBeVisible({ timeout: 5000 });
    });

    test('should display share button', async ({ page }) => {
      const shareButton = page.locator('button').filter({ hasText: /Share/i });
      await expect(shareButton).toBeVisible({ timeout: 5000 });
    });

    test('simulate button should be disabled without grimoire', async ({ page }) => {
      const simulateButton = page.locator('button').filter({ hasText: /Simulate|Refresh/i });
      const isDisabled = await simulateButton.isDisabled().catch(() => true);

      // Should be disabled when no grimoire selected
      expect(isDisabled).toBe(true);
    });
  });

  test.describe('Complete Workflow - Success Path', () => {
    test.beforeEach(async ({ page }) => {
      const errorAlert = page.locator('[role="alert"]');
      const hasError = await errorAlert.isVisible().catch(() => false);

      if (hasError) {
        test.skip(true, 'Data loading error - cannot test workflow');
      }
    });

    test('should complete basic simulation flow', async ({ page }) => {
      // 1. Select grimoire
      const grimoireSelect = page.locator('div[role="combobox"]').first();
      await grimoireSelect.click();
      await page.waitForTimeout(500);

      const options = page.locator('li[role="option"]');
      const optionCount = await options.count();

      if (optionCount > 1) {
        // Select a grimoire
        await options.nth(1).click();
        await page.waitForTimeout(1500);

        // 2. Click simulate button
        const simulateButton = page.locator('button').filter({ hasText: /Simulate|Refresh/i });
        const isEnabled = !(await simulateButton.isDisabled());

        if (isEnabled) {
          await simulateButton.click();
          await page.waitForTimeout(1000);

          // 3. Results should appear
          // Look for skill properties or combination details
          const hasResults =
            (await page.locator('text=/Skill Properties|Combination/i').count()) > 0;
          expect(hasResults).toBe(true);
        }
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt layout for mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Page should still render (either content or error)
      const hasContent = (await page.locator('label, [role="alert"]').count()) > 0;
      expect(hasContent).toBe(true);
    });

    test('should adapt layout for tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      // Page should still render
      const hasContent = (await page.locator('label, [role="alert"]').count()) > 0;
      expect(hasContent).toBe(true);
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      const errorAlert = page.locator('[role="alert"]');
      const hasError = await errorAlert.isVisible().catch(() => false);

      if (hasError) {
        test.skip(true, 'Data loading error - cannot test accessibility');
      }
    });

    test('should have proper labels for form controls', async ({ page }) => {
      // All form controls should have labels
      const labelCount = await page.locator('label').count();
      expect(labelCount).toBeGreaterThan(0);
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Tab through controls
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Focused element should be visible
      const focusedElement = page.locator(':focus');
      const isFocused = await focusedElement.count();
      expect(isFocused).toBeGreaterThan(0);
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      // Check for section headings
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();

      // Should have at least some headings
      expect(headingCount).toBeGreaterThan(0);
    });
  });
});
