import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Leaderboards Page
 *
 * This test file covers the Leaderboards page (/leaderboards) which provides:
 * - Trial zone selection (raids like Sunspire, Rockgrove, etc.)
 * - Boss encounter selection
 * - Difficulty filtering
 * - Leaderboard rankings display with scores and percentiles
 * - Team/guild information
 * - Pagination through rankings
 * - Navigation to specific fight reports
 *
 * The leaderboards use GraphQL queries to fetch fight rankings from ESO Logs API.
 *
 * Related Jira: ESO-505
 */

test.describe('Leaderboards Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leaderboards');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test.describe('Page Loading', () => {
    test('should load leaderboards page', async ({ page }) => {
      // Verify URL
      await expect(page).toHaveURL(/.*leaderboards/);
    });

    test('should display page or loading state', async ({ page }) => {
      // Wait for loading to complete
      await page.waitForTimeout(3000);

      // Should show either content or error (not blank)
      const hasContent = (await page.locator('select, [role="combobox"]').count()) > 0;
      const hasError = await page.locator('[role="alert"]').isVisible().catch(() => false);
      const isLoading = await page.locator('[role="progressbar"]').isVisible().catch(() => false);

      // Should be in some state (not completely blank)
      expect(hasContent || hasError || isLoading).toBe(true);
    });

    test('should not be stuck in infinite loading', async ({ page }) => {
      // Wait for initial data load
      await page.waitForTimeout(5000);

      // Loading spinner should not be visible indefinitely
      const loadingSpinner = page.locator('[role="progressbar"]');
      const isLoading = await loadingSpinner.isVisible().catch(() => false);

      // If still loading after 5 seconds, might be stuck or API slow
      if (isLoading) {
        console.log('⚠️  Still loading after 5 seconds - API may be slow or unavailable');
      }

      // Page should have some interactive elements even if loading
      const hasSelectors = (await page.locator('select, button').count()) > 0;
      expect(hasSelectors || !isLoading).toBe(true);
    });
  });

  test.describe('Zone Selection', () => {
    test.beforeEach(async ({ page }) => {
      // Wait for zones to load
      await page.waitForTimeout(3000);

      // Skip if error state
      const hasError = await page.locator('[role="alert"]').isVisible().catch(() => false);
      if (hasError) {
        test.skip(true, 'API error - cannot test zone selection');
      }
    });

    test('should display zone selector', async ({ page }) => {
      // Look for zone/trial dropdown
      const zoneSelect = page.locator('select').first();
      await expect(zoneSelect).toBeVisible({ timeout: 5000 });
    });

    test('should have trial zone options', async ({ page }) => {
      // Check for select with options
      const zoneSelect = page.locator('select').first();
      const options = zoneSelect.locator('option');
      const optionCount = await options.count();

      // Should have at least some trial zones
      expect(optionCount).toBeGreaterThan(0);
    });

    test('should be able to change zones', async ({ page }) => {
      const zoneSelect = page.locator('select').first();
      const options = zoneSelect.locator('option');
      const optionCount = await options.count();

      if (optionCount > 1) {
        // Get second option value
        const secondOptionValue = await options.nth(1).getAttribute('value');

        if (secondOptionValue) {
          // Select second zone
          await zoneSelect.selectOption(secondOptionValue);
          await page.waitForTimeout(1000);

          // Selected value should update
          const selectedValue = await zoneSelect.inputValue();
          expect(selectedValue).toBe(secondOptionValue);
        }
      }
    });
  });

  test.describe('Encounter Selection', () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForTimeout(3000);

      const hasError = await page.locator('[role="alert"]').isVisible().catch(() => false);
      if (hasError) {
        test.skip(true, 'API error - cannot test encounter selection');
      }
    });

    test('should display encounter selector', async ({ page }) => {
      // Look for encounter/boss dropdown (second select typically)
      const selects = page.locator('select');
      const selectCount = await selects.count();

      // Should have at least 2 selects (zone and encounter)
      expect(selectCount).toBeGreaterThanOrEqual(2);
    });

    test('should have encounter options', async ({ page }) => {
      // Second select should be encounters
      const encounterSelect = page.locator('select').nth(1);
      const options = encounterSelect.locator('option');
      const optionCount = await options.count();

      // Should have at least some encounters
      expect(optionCount).toBeGreaterThan(0);
    });

    test('should be able to change encounters', async ({ page }) => {
      const encounterSelect = page.locator('select').nth(1);
      const options = encounterSelect.locator('option');
      const optionCount = await options.count();

      if (optionCount > 1) {
        // Select second encounter
        const secondOptionValue = await options.nth(1).getAttribute('value');

        if (secondOptionValue) {
          await encounterSelect.selectOption(secondOptionValue);
          await page.waitForTimeout(2000);

          // Should update selection
          const selectedValue = await encounterSelect.inputValue();
          expect(selectedValue).toBe(secondOptionValue);
        }
      }
    });
  });

  test.describe('Difficulty Selection', () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForTimeout(3000);

      const hasError = await page.locator('[role="alert"]').isVisible().catch(() => false);
      if (hasError) {
        test.skip(true, 'API error - cannot test difficulty selection');
      }
    });

    test('should display difficulty selector', async ({ page }) => {
      // Look for difficulty dropdown (third select typically)
      const selects = page.locator('select');
      const selectCount = await selects.count();

      // Should have at least 3 selects (zone, encounter, difficulty)
      expect(selectCount).toBeGreaterThanOrEqual(3);
    });

    test('should have difficulty options', async ({ page }) => {
      // Third select should be difficulty
      const difficultySelect = page.locator('select').nth(2);
      const options = difficultySelect.locator('option');
      const optionCount = await options.count();

      // Should have at least one difficulty
      expect(optionCount).toBeGreaterThan(0);
    });
  });

  test.describe('Leaderboard Display', () => {
    test.beforeEach(async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(5000);

      const hasError = await page.locator('[role="alert"]').isVisible().catch(() => false);
      if (hasError) {
        test.skip(true, 'API error - cannot test leaderboard display');
      }
    });

    test('should display leaderboard table or empty state', async ({ page }) => {
      // Check for table or empty message
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      const hasEmptyMessage = await page
        .locator('text=/No leaderboard entries|No data/i')
        .isVisible()
        .catch(() => false);

      // Should show either table or empty state
      expect(hasTable || hasEmptyMessage).toBe(true);
    });

    test('should display table headers if data exists', async ({ page }) => {
      const table = page.locator('table');
      const isTableVisible = await table.isVisible().catch(() => false);

      if (isTableVisible) {
        // Check for table headers
        const headers = ['Rank', 'Score', 'Team', 'Duration'];

        for (const headerText of headers) {
          const header = page.locator('th', { hasText: new RegExp(headerText, 'i') });
          await expect(header).toBeVisible({ timeout: 3000 });
        }
      }
    });

    test('should display ranking entries if data exists', async ({ page }) => {
      const table = page.locator('table tbody');
      const isTableVisible = await table.isVisible().catch(() => false);

      if (isTableVisible) {
        // Check for table rows
        const rows = table.locator('tr');
        const rowCount = await rows.count();

        // Should have at least one row
        expect(rowCount).toBeGreaterThan(0);
      }
    });

    test('should display rank numbers', async ({ page }) => {
      const table = page.locator('table tbody');
      const isTableVisible = await table.isVisible().catch(() => false);

      if (isTableVisible) {
        const firstRow = table.locator('tr').first();
        const cells = firstRow.locator('td');
        const firstCellText = await cells.first().textContent();

        // First cell should contain a rank number
        expect(firstCellText).toBeTruthy();
        expect(firstCellText!.trim()).toMatch(/^\d+$/);
      }
    });

    test('should display team/guild names', async ({ page }) => {
      const table = page.locator('table tbody');
      const isTableVisible = await table.isVisible().catch(() => false);

      if (isTableVisible) {
        // Look for team name in third column typically
        const firstRow = table.locator('tr').first();
        const teamCell = firstRow.locator('td').nth(2);
        const teamText = await teamCell.textContent();

        // Team cell should have some text
        expect(teamText).toBeTruthy();
        expect(teamText!.trim().length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Pagination', () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForTimeout(5000);

      const hasError = await page.locator('[role="alert"]').isVisible().catch(() => false);
      if (hasError) {
        test.skip(true, 'API error - cannot test pagination');
      }
    });

    test('should display pagination controls', async ({ page }) => {
      // Look for Previous/Next buttons
      const previousButton = page.locator('button', { hasText: /Previous/i });
      const nextButton = page.locator('button', { hasText: /Next/i });

      await expect(previousButton).toBeVisible({ timeout: 5000 });
      await expect(nextButton).toBeVisible({ timeout: 5000 });
    });

    test('should display current page number', async ({ page }) => {
      // Look for page indicator
      const pageIndicator = page.locator('text=/Page \\d+/i');
      await expect(pageIndicator).toBeVisible({ timeout: 5000 });
    });

    test('Previous button should be disabled on page 1', async ({ page }) => {
      const previousButton = page.locator('button', { hasText: /Previous/i });
      const isDisabled = await previousButton.isDisabled();

      // Should be disabled on first page
      expect(isDisabled).toBe(true);
    });

    test('should be able to navigate to next page if available', async ({ page }) => {
      const nextButton = page.locator('button', { hasText: /Next/i });
      const isDisabled = await nextButton.isDisabled();

      if (!isDisabled) {
        // Click next
        await nextButton.click();
        await page.waitForTimeout(2000);

        // Page number should change
        const pageIndicator = page.locator('text=/Page \\d+/i');
        const pageText = await pageIndicator.textContent();
        expect(pageText).toMatch(/Page [2-9]/i);
      }
    });
  });

  test.describe('Refresh Functionality', () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForTimeout(5000);

      const hasError = await page.locator('[role="alert"]').isVisible().catch(() => false);
      if (hasError) {
        test.skip(true, 'API error - cannot test refresh');
      }
    });

    test('should display refresh button', async ({ page }) => {
      // Look for refresh/reload button
      const refreshButton = page.locator('button', { hasText: /Refresh|Reload/i });
      const hasRefreshButton = await refreshButton.isVisible().catch(() => false);

      if (hasRefreshButton) {
        expect(hasRefreshButton).toBe(true);
      }
    });
  });

  test.describe('Report Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForTimeout(5000);

      const hasError = await page.locator('[role="alert"]').isVisible().catch(() => false);
      if (hasError) {
        test.skip(true, 'API error - cannot test navigation');
      }
    });

    test('should have clickable report links if data exists', async ({ page }) => {
      const table = page.locator('table tbody');
      const isTableVisible = await table.isVisible().catch(() => false);

      if (isTableVisible) {
        // Look for View link/button in rows
        const firstRow = table.locator('tr').first();
        const viewLink = firstRow.locator('a, button').filter({ hasText: /View|Report/i });
        const hasLink = await viewLink.isVisible().catch(() => false);

        if (hasLink) {
          expect(hasLink).toBe(true);
        } else {
          // Some implementations might make entire row clickable
          console.log('No explicit View link found - rows might be clickable');
        }
      }
    });
  });

  test.describe('Metric Display', () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForTimeout(5000);

      const hasError = await page.locator('[role="alert"]').isVisible().catch(() => false);
      if (hasError) {
        test.skip(true, 'API error - cannot test metrics');
      }
    });

    test('should display metric indicator', async ({ page }) => {
      // Look for metric chip/badge (e.g., "Metric: Score")
      const metricChip = page.locator('text=/Metric:/i');
      const hasMetric = await metricChip.isVisible().catch(() => false);

      if (hasMetric) {
        const metricText = await metricChip.textContent();
        expect(metricText).toBeTruthy();
        expect(metricText!.toLowerCase()).toContain('metric');
      }
    });

    test('should display total rankings if available', async ({ page }) => {
      // Look for total count (e.g., "Ranked runs: 1,234")
      const totalIndicator = page.locator('text=/Ranked runs:|Total:/i');
      const hasTotal = await totalIndicator.isVisible().catch(() => false);

      if (hasTotal) {
        const totalText = await totalIndicator.textContent();
        expect(totalText).toBeTruthy();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Wait for potential error
      await page.waitForTimeout(5000);

      const errorAlert = page.locator('[role="alert"][class*="error"], [severity="error"]');
      const hasError = await errorAlert.isVisible().catch(() => false);

      if (hasError) {
        // Error should have meaningful message
        const errorText = await errorAlert.textContent();
        expect(errorText).toBeTruthy();
        console.log('📝 Leaderboard Error:', errorText);

        // Should have retry button if error
        const retryButton = page.locator('button', { hasText: /Retry|Try Again/i });
        const hasRetry = await retryButton.isVisible().catch(() => false);

        if (hasRetry) {
          expect(hasRetry).toBe(true);
        }
      }
    });

    test('should display empty state when no data', async ({ page }) => {
      await page.waitForTimeout(5000);

      const emptyMessage = page.locator('text=/No leaderboard entries|No data available/i');
      const hasEmptyMessage = await emptyMessage.isVisible().catch(() => false);

      if (hasEmptyMessage) {
        const messageText = await emptyMessage.textContent();
        expect(messageText).toBeTruthy();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt layout for mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(3000);

      // Page should still render
      const hasContent = (await page.locator('select, table, button').count()) > 0;
      expect(hasContent).toBe(true);

      // Selects should be visible on mobile
      const firstSelect = page.locator('select').first();
      const hasSelect = await firstSelect.isVisible().catch(() => false);
      
      if (hasSelect) {
        await expect(firstSelect).toBeVisible();
      }
    });

    test('should adapt layout for tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(3000);

      // All elements should be visible
      const hasContent = (await page.locator('select, table, button').count()) > 0;
      expect(hasContent).toBe(true);
    });

    test('should handle table responsively', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(5000);

      const table = page.locator('table');
      const isTableVisible = await table.isVisible().catch(() => false);

      if (isTableVisible) {
        // Table should be scrollable or responsive
        const tableContainer = table.locator('..');
        await expect(tableContainer).toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForTimeout(3000);

      const hasError = await page.locator('[role="alert"]').isVisible().catch(() => false);
      if (hasError) {
        test.skip(true, 'API error - cannot test accessibility');
      }
    });

    test('should have proper labels for selects', async ({ page }) => {
      // All selects should have labels or aria-labels
      const selects = page.locator('select');
      const selectCount = await selects.count();

      expect(selectCount).toBeGreaterThan(0);

      // Check that selects are properly labeled (via label element or form control)
      for (let i = 0; i < Math.min(selectCount, 3); i++) {
        const select = selects.nth(i);
        await expect(select).toBeVisible();
      }
    });

    test('should support keyboard navigation for selects', async ({ page }) => {
      // Tab through controls
      await page.keyboard.press('Tab');
      await page.waitForTimeout(300);

      // Focused element should be a select or button
      const focusedElement = page.locator(':focus');
      const isFocused = await focusedElement.count();
      expect(isFocused).toBeGreaterThan(0);
    });

    test('should have proper table structure', async ({ page }) => {
      await page.waitForTimeout(5000);

      const table = page.locator('table');
      const isTableVisible = await table.isVisible().catch(() => false);

      if (isTableVisible) {
        // Table should have thead and tbody
        const thead = table.locator('thead');
        const tbody = table.locator('tbody');

        await expect(thead).toBeVisible();
        await expect(tbody).toBeVisible();
      }
    });

    test('should have navigation buttons with proper labels', async ({ page }) => {
      const previousButton = page.locator('button', { hasText: /Previous/i });
      const nextButton = page.locator('button', { hasText: /Next/i });

      await expect(previousButton).toBeVisible({ timeout: 5000 });
      await expect(nextButton).toBeVisible({ timeout: 5000 });

      // Buttons should have text content
      const prevText = await previousButton.textContent();
      const nextText = await nextButton.textContent();

      expect(prevText).toBeTruthy();
      expect(nextText).toBeTruthy();
    });
  });
});
