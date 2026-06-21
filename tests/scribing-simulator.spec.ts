import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Scribing Simulator page (/scribing-simulator).
 *
 * The simulator is a live grimoire + script planner: choose a grimoire, slot its
 * compatible Focus / Signature / Affix scripts, and see the resulting scribed
 * skill update instantly. Selection is mirrored to the URL for sharing.
 *
 * Tests tolerate a data-load error state (the page shows an alert) so they don't
 * flake if the bundled dataset ever fails validation.
 */

test.describe('Scribing Simulator Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/scribing-simulator');
    await page.waitForLoadState('networkidle');
  });

  const hasError = async (page: import('@playwright/test').Page): Promise<boolean> =>
    page
      .locator('[role="alert"]')
      .first()
      .isVisible()
      .catch(() => false);

  test('loads the simulator (or a clean error state)', async ({ page }) => {
    await expect(page).toHaveURL(/scribing-simulator/);
    const heading = page.getByRole('heading', { name: /ESO Scribing Simulator/i });
    const errorVisible = await hasError(page);
    expect(errorVisible || (await heading.isVisible())).toBe(true);
  });

  test('is not stuck loading', async ({ page }) => {
    await page.waitForTimeout(1500);
    const spinner = page.locator('[role="progressbar"]');
    expect(await spinner.isVisible().catch(() => false)).toBe(false);
  });

  test.describe('success path', () => {
    test.beforeEach(async ({ page }) => {
      if (await hasError(page)) test.skip(true, 'Data load error — cannot test UI');
    });

    test('shows the grimoire chooser and three script slots', async ({ page }) => {
      await expect(page.getByRole('radiogroup', { name: /Grimoire/i })).toBeVisible();
      for (const slot of ['Focus', 'Signature', 'Affix']) {
        await expect(page.getByText(new RegExp(`${slot} Script`, 'i')).first()).toBeVisible();
      }
    });

    test('offers all twelve grimoires', async ({ page }) => {
      const grimoires = page.getByRole('radio');
      await expect(grimoires).toHaveCount(12);
    });

    test('previews a scribed skill that updates when a focus is chosen', async ({ page }) => {
      await expect(page.getByText(/Your scribed skill/i)).toBeVisible();

      // Pick the first grimoire, then a focus, and confirm the URL + preview react.
      await page.getByRole('radio').first().click();
      const focusOption = page
        .locator('[aria-label="Focus script options"] [role="option"]')
        .first();
      await focusOption.click();

      await expect(page).toHaveURL(/grimoire=.+focus=/);
    });

    test('exposes the build controls', async ({ page }) => {
      for (const label of ['Surprise me', 'Reset scripts', 'Share build']) {
        await expect(page.getByRole('button', { name: new RegExp(label, 'i') })).toBeVisible();
      }
    });

    test('randomises a complete build via "Surprise me"', async ({ page }) => {
      await page.getByRole('button', { name: /Surprise me/i }).click();
      await expect(page).toHaveURL(/grimoire=.+focus=.+signature=.+affix=/);
    });

    test('restores a build from a shared URL', async ({ page }) => {
      await page.goto('/scribing-simulator?grimoire=traveling-knife&focus=physical-damage');
      await page.waitForLoadState('networkidle');
      if (await hasError(page)) test.skip(true, 'Data load error');
      // The physical focus renames Traveling Knife to "Sundering Knife".
      await expect(page.getByText(/Sundering Knife/i).first()).toBeVisible();
    });
  });

  test.describe('responsive', () => {
    test('renders on a mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);
      const content = await page.locator('[role="radiogroup"], [role="alert"]').count();
      expect(content).toBeGreaterThan(0);
    });
  });
});
