import { test, expect } from '@playwright/test';

test.describe('Responsive report route smoke checks', () => {
  const testReportId = process.env.E2E_REPORT_CODE ?? 'F4f2bMwWtgVKxjB9';
  const testUrl = `/r/${testReportId}`;

  test('mobile report route - 375x667', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for animations

    await expect(page).toHaveTitle(/ESO Toolkit/, { timeout: 30000 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('tablet report route - 768x1024', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveTitle(/ESO Toolkit/, { timeout: 30000 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('desktop report route - 1920x1080', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveTitle(/ESO Toolkit/, { timeout: 30000 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('small mobile report route - 320x568', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveTitle(/ESO Toolkit/, { timeout: 30000 });
    await expect(page.locator('body')).toBeVisible();
  });
});
