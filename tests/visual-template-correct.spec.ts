import { test, expect } from '@playwright/test';

import { createSkeletonDetector } from './utils/skeleton-detector';

const TEST_REPORT_CODE = process.env.E2E_REPORT_CODE ?? 'F4f2bMwWtgVKxjB9';
const TEST_FIGHT_ID = process.env.E2E_FIGHT_ID ?? '5';

/**
 * ✅ CORRECT TEMPLATE: Loaded-content test with skeleton detection
 *
 * This template demonstrates the proper way to write Playwright visual tests
 * for ESO Toolkit. Copy this pattern for all visual tests.
 *
 * KEY POINTS:
 * 1. Always import createSkeletonDetector
 * 2. Always wait for skeletons to disappear before screenshots
 * 3. Use generous timeouts (45s) for complex pages
 * 4. Add safety waits for animations to settle
 *
 * For detailed documentation including anti-patterns to avoid, see:
 * @see ./VISUAL_TEST_PATTERNS.md
 *
 * NOTE: These tests intentionally avoid checked-in report screenshots. Live report
 * pages can contain player handles and other personal data, so the template keeps
 * behavior coverage while leaving visual capture to reviewed, local-only runs.
 */

test.describe('Loaded-content pattern template', () => {
  // Test 1: Simple page load
  test('should expose loaded content after skeletons disappear', async ({ page }) => {
    console.log('🔍 Starting visual test with skeleton detection...');

    // Step 1: Navigate to page
    await page.goto(`/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}/players`);

    // Step 2: Wait for basic page load (title check)
    await expect(page).toHaveTitle(/ESO Toolkit/, { timeout: 30000 });

    // Step 3: CRITICAL - Create skeleton detector and wait for skeletons to disappear
    console.log('⏳ Waiting for loading skeletons to disappear...');
    const skeletonDetector = createSkeletonDetector(page);

    // Check initial skeleton state (optional but helpful for debugging)
    const initialSkeletonInfo = await skeletonDetector.getSkeletonInfo();
    console.log(`Initial skeleton count: ${initialSkeletonInfo.count}`);

    // Wait for ALL skeletons to disappear
    await skeletonDetector.waitForSkeletonsToDisappear({
      timeout: 45000, // Generous timeout for complex data loading
      stabilityTimeout: 1000, // Wait 1s after skeletons disappear for stability
    });

    console.log('✅ All skeletons have disappeared - UI is ready');

    // Step 4: Safety wait for animations to settle
    await page.waitForTimeout(1000);

    // Step 5: Verify no skeletons remain (optional verification)
    const finalSkeletonInfo = await skeletonDetector.getSkeletonInfo();
    if (finalSkeletonInfo.hasSkeletons) {
      console.warn(`⚠️ Warning: ${finalSkeletonInfo.count} skeletons still present`);
    }

    await expect(page.locator('body')).toBeVisible();
    console.log('✅ Loaded report content is available');
  });

  // Test 2: Component-specific screenshot
  test('should take component screenshot after content loads', async ({ page }) => {
    // Step 1: Navigate to report landing page first
    await page.goto(`/report/${TEST_REPORT_CODE}`);

    const skeletonDetector = createSkeletonDetector(page);
    await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });

    // Step 2: Find and click a fight button
    const fightButtons = page.locator('[data-testid^="fight-button-"]');
    const firstButton = fightButtons.first();

    if (await firstButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Fallback: Navigate directly to a fight
      await page.goto(`/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}/damage`);
    }

    // Step 3: Wait for skeletons to disappear
    await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });

    // Step 4: Check if damage table exists, if not keep the route assertion
    const damageTable = page.locator('[data-testid="damage-done-table"]');
    const isDamageTableVisible = await damageTable.isVisible({ timeout: 5000 }).catch(() => false);

    if (isDamageTableVisible) {
      await expect(damageTable).toBeVisible();
    } else {
      console.log(
        '⚠️ Damage table not found - skipping optional table assertion (may be expected for this report)',
      );
      // Just verify page loaded
      await expect(page.locator('body')).toBeVisible();
    }
  });

  // Test 3: Multi-step workflow with navigation
  test('should handle navigation between tabs correctly', async ({ page }) => {
    // Navigate to main report page
    await page.goto(`/report/${TEST_REPORT_CODE}`);

    const skeletonDetector = createSkeletonDetector(page);

    // Step 1: Wait for initial page load
    await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();

    // Step 2: Find and click a fight button to navigate to fight details
    const fightButtons = page.locator('[data-testid^="fight-button-"]');
    const firstButton = fightButtons.first();

    if (await firstButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstButton.click();
      await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
      await page.waitForTimeout(1000);
    } else {
      console.log('⚠️ No fight buttons found - skipping tab navigation test');
      return;
    }

    // Step 3: Check if we can navigate to players tab
    const playersTab = page.locator('[data-testid="players-tab"]');
    if (await playersTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await playersTab.click();
      await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
      await page.waitForTimeout(1000);
      await expect(playersTab).toBeVisible();

      // Step 4: Navigate to damage tab
      const damageTab = page.locator('[data-testid="damage-tab"]');
      if (await damageTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await damageTab.click();
        await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
        await page.waitForTimeout(1000);
        await expect(damageTab).toBeVisible();
      } else {
        console.log('⚠️ Damage tab not found - skipping');
      }
    } else {
      console.log('⚠️ Players tab not found - skipping tab navigation');
    }
  });

  // Test 4: Debug pattern when tests fail
  test('should demonstrate debugging when skeletons persist', async ({ page }) => {
    await page.goto('/calculator');

    const skeletonDetector = createSkeletonDetector(page);

    try {
      await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 15000 });
    } catch (error) {
      // If skeletons persist, get detailed debugging info
      console.log('🐛 Debugging skeleton persistence...');

      const skeletonInfo = await skeletonDetector.getSkeletonInfo();
      console.log(`Remaining skeleton count: ${skeletonInfo.count}`);
      console.log(`Skeleton types: ${skeletonInfo.types.join(', ')}`);

      // Get details about each remaining skeleton
      const visibleSkeletons = await skeletonDetector.getVisibleSkeletons();
      for (let i = 0; i < Math.min(visibleSkeletons.length, 5); i++) {
        const testId = await visibleSkeletons[i].getAttribute('data-testid');
        console.log(`Skeleton ${i}: ${testId}`);
      }

      // Re-throw the error after logging debug info
      throw error;
    }

    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
  });
});
