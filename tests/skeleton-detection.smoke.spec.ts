import { expect, test } from '@playwright/test';

import { ANALYZER_REPORT_TITLE, analyzerTest } from './utils/analyzer-fixtures';
import { SKELETON_SELECTORS, skeletonHelpers } from './utils/skeleton-detector';

const CALCULATOR_CARD = '[data-calculator-card="true"]';
const LANDING_HEADING = /Essential Tools.*Your ESO Journey/;

test.describe('Skeleton Detection Smoke Tests', () => {
  test('calculator renders its content without loading skeletons', async ({ page }) => {
    await page.goto('/calculator');

    await expect(page).toHaveURL(/\/calculator(?:$|[?#])/);
    await expect(page.locator(CALCULATOR_CARD)).toBeVisible();
    await expect(page.locator(SKELETON_SELECTORS.ANY_SKELETON)).toHaveCount(0);
  });

  test('home renders its hero content without loading skeletons', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: LANDING_HEADING })).toBeVisible();
    await expect(page.locator(SKELETON_SELECTORS.ANY_SKELETON)).toHaveCount(0);
  });

  test('calculator-specific skeletons are removed after calculator content renders', async ({
    page,
  }) => {
    await page.goto('/calculator');

    await expect(page).toHaveURL(/\/calculator(?:$|[?#])/);
    await expect(page.locator(CALCULATOR_CARD)).toBeVisible();
    await expect(page.locator(SKELETON_SELECTORS.CALCULATOR)).toHaveCount(0);
  });

  test('skeleton helper counts confirm a ready home page', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: LANDING_HEADING })).toBeVisible();
    await expect.poll(() => skeletonHelpers.count(page)).toBe(0);
  });
});

analyzerTest.describe('Analyzer skeleton detection smoke tests', () => {
  analyzerTest('Analyzer summary reaches populated content without loading skeletons', async ({
    analyzerPage,
  }) => {
    await expect(
      analyzerPage.getByRole('heading', { name: ANALYZER_REPORT_TITLE, exact: true }),
    ).toBeVisible();
    await expect(
      analyzerPage.getByRole('rowheader', { name: 'E2E Player', exact: true }),
    ).toBeVisible();
    await expect(analyzerPage.locator(SKELETON_SELECTORS.ANY_SKELETON)).toHaveCount(0);
  });
});
