import { test, expect } from '@playwright/test';

/**
 * Smoke Tests for Roster Builder Page
 * 
 * Basic validation tests for roster builder functionality.
 * Tests verify the page loads and core features are accessible.
 * 
 * Related Jira: ESO-521
 */

test.describe('Roster Builder - Smoke Tests', () => {
  test('should load roster builder page', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('domcontentloaded');
    
    // Verify URL
    await expect(page).toHaveURL(/.*roster-builder/);
    
    // Should not be 404
    const notFound = await page.locator('text=/404|not found/i').count();
    expect(notFound).toBe(0);
  });

  test('should render without critical errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.goto('/roster-builder');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Filter out expected errors
    const criticalErrors = errors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('should have interactive elements', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Should have buttons
    const buttons = await page.locator('button').count();
    expect(buttons).toBeGreaterThan(0);
    
    // Should have inputs
    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThan(0);
  });

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Tab key should work
    await page.keyboard.press('Tab');
    
    // Should have focusable elements
    const focusable = await page.locator('button, a, input, [tabindex]').count();
    expect(focusable).toBeGreaterThan(0);
  });

  test('should handle viewport resize', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('domcontentloaded');
    
    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(300);
    
    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    
    // Should still have content
    const body = await page.locator('body').isVisible();
    expect(body).toBe(true);
  });
});
