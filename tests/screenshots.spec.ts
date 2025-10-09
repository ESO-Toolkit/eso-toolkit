import { test, expect } from '@playwright/test';

test.describe('Responsive Screenshots', () => {
  const testReportId = '98b3845e3c1ed2a6191e-67039068743d5eeb2855';
  const testUrl = `/r/${testReportId}`;

  test('mobile screenshot - 375x667', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for animations

    await expect(page).toHaveScreenshot('mobile-375x667.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('tablet screenshot - 768x1024', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('tablet-768x1024.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('desktop screenshot - 1920x1080', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('desktop-1920x1080.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('mobile small screenshot - 320x568', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('mobile-small-320x568.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});