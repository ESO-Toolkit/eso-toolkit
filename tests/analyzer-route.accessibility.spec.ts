import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { openPopulatedAnalyzer } from './utils/analyzer-route-fixture';

test.describe('populated Analyzer report controls', () => {
  test('has named, keyboard-reachable report controls and no axe violations', async ({ page }) => {
    const unexpectedOperations = await openPopulatedAnalyzer(page);
    expect(unexpectedOperations).toEqual([]);

    const controls = page.locator(
      'button:visible:not([tabindex="-1"]), a:visible:not([tabindex="-1"]), [role="button"]:visible:not([tabindex="-1"]), [role="tab"]:visible:not([tabindex="-1"])',
    );
    const controlCount = await controls.count();
    expect(controlCount).toBeGreaterThan(0);

    for (let index = 0; index < controlCount; index += 1) {
      const control = controls.nth(index);
      await expect(control, `control ${index + 1} has an accessible name`).toHaveAccessibleName(
        /\S+/,
      );
      await expect
        .poll(() => control.evaluate((element) => (element as HTMLElement).tabIndex >= 0), {
          message: `control ${index + 1} is keyboard reachable`,
        })
        .toBe(true);
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .exclude('.vite-error-overlay')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('keeps report controls usable at 200% zoom with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
    await page.setViewportSize({ width: 780, height: 1688 });
    const unexpectedOperations = await openPopulatedAnalyzer(page);
    expect(unexpectedOperations).toEqual([]);

    await expect(page.getByTestId('fight-tab-content-container')).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
    await expect(page.getByRole('heading', { name: 'Fight Insights', exact: true })).toBeVisible();
  });

  test('renders the populated report controls in dark color scheme', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'dark' });
    const unexpectedOperations = await openPopulatedAnalyzer(page);
    expect(unexpectedOperations).toEqual([]);
    await expect(page.getByTestId('fight-tab-content-container')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fight Insights', exact: true })).toBeVisible();
  });
});
