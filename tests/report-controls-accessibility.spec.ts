import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

import { openPopulatedAnalyzer } from './utils/analyzer-route-fixture';

const viewports = [
  { name: 'desktop', size: { width: 1280, height: 800 }, colorScheme: 'light' as const },
  { name: 'mobile', size: { width: 390, height: 844 }, colorScheme: 'dark' as const },
] as const;

const namedControls = [
  { name: 'filters', locator: (page: Page) => page.getByRole('button', { name: /^Filters:/ }) },
  {
    name: 'replay',
    locator: (page: Page) => page.getByRole('button', { name: 'Interactive Fight Replay' }),
  },
  {
    name: 'ESO Logs',
    locator: (page: Page) => page.getByRole('link', { name: 'View full report on ESO Logs' }),
  },
  {
    name: 'all fights',
    locator: (page: Page) => page.getByRole('button', { name: 'All', exact: true }),
  },
  {
    name: 'boss fights',
    locator: (page: Page) => page.getByRole('button', { name: 'Bosses', exact: true }),
  },
  { name: 'Insights tab', locator: (page: Page) => page.getByRole('tab', { name: 'Insights' }) },
] as const;

const expectVisibleUnobscuredFocus = async (page: Page, control: Locator, name: string) => {
  await control.scrollIntoViewIfNeeded();
  // Establish keyboard modality before focusing each control. A programmatic focus alone does
  // not activate :focus-visible consistently across Chromium, Firefox, and WebKit.
  await page.keyboard.press('Tab');
  await control.focus();
  await expect(control, `${name} receives focus`).toBeFocused();

  const focus = await control.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const unobscured =
      x >= 0 &&
      y >= 0 &&
      x < window.innerWidth &&
      y < window.innerHeight &&
      document.elementsFromPoint(x, y).some((hit) => hit === element || element.contains(hit));

    return {
      unobscured,
      visibleFocus:
        (style.outlineStyle !== 'none' && style.outlineWidth !== '0px') ||
        style.boxShadow !== 'none',
    };
  });

  expect(focus.unobscured, `${name} remains unobscured when focused`).toBe(true);
  expect(focus.visibleFocus, `${name} has a visible focus indicator`).toBe(true);
};

const expectTouchTarget = async (control: Locator, name: string) => {
  const box = await control.boundingBox();
  expect(box, `${name} has a rendered touch target`).not.toBeNull();
  // Firefox can report a 44px CSS target as 43.999992 due to subpixel layout rounding.
  const minimumTouchTarget = 43.5;
  expect(box?.width, `${name} touch target width`).toBeGreaterThanOrEqual(minimumTouchTarget);
  expect(box?.height, `${name} touch target height`).toBeGreaterThanOrEqual(minimumTouchTarget);
};

test.describe('Analyzer report header and filter controls', () => {
  for (const viewport of viewports) {
    test(`has accessible populated-state controls at ${viewport.name} size`, async ({ page }) => {
      await page.setViewportSize(viewport.size);
      await page.emulateMedia({ colorScheme: viewport.colorScheme, reducedMotion: 'reduce' });

      const unexpectedOperations = await openPopulatedAnalyzer(page);
      expect(unexpectedOperations).toEqual([]);
      await expect(page).toHaveURL(/\/report\/AnalyzerMatrixFixture01\/fight\/5\/insights$/);

      const horizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(horizontalOverflow, 'the populated report reflows without page-wide overflow').toBe(
        false,
      );

      for (const controlDefinition of namedControls) {
        const control = controlDefinition.locator(page);
        await expect(control, `${controlDefinition.name} is visible`).toBeVisible();
        await expect(
          control,
          `${controlDefinition.name} has an accessible name`,
        ).toHaveAccessibleName(/\S+/);
        await expectVisibleUnobscuredFocus(page, control, controlDefinition.name);
        await expectTouchTarget(control, controlDefinition.name);
      }

      // The MUI popover marks the trigger subtree inert while open, so role queries can no longer
      // see the trigger for the expanded-state assertion. The explicit aria-label remains stable.
      const filterTrigger = page.locator('button[aria-label^="Filters:"]').first();
      await expect(filterTrigger).toHaveAttribute('aria-expanded', 'false');
      await filterTrigger.click();
      await expect(filterTrigger).toHaveAttribute('aria-expanded', 'true');

      const filterDialog = page.getByRole('dialog', { name: 'Analyzer filters' });
      await expect(filterDialog).toBeVisible();
      await expect(filterDialog.getByRole('radiogroup', { name: 'Player filter' })).toBeVisible();
      await expect(filterDialog.getByRole('radio', { name: 'All Players' })).toBeChecked();
      await expect(filterDialog.getByRole('group', { name: 'Target filter' })).toHaveCount(0);

      const axeResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .include('[data-testid="fight-details-loaded"]')
        .include('[role="dialog"][aria-label="Analyzer filters"]')
        .analyze();
      expect(axeResults.violations).toEqual([]);
    });
  }
});
