import { devices, expect } from '@playwright/test';

import {
  ANALYZER_REPORT_CODE,
  ANALYZER_REPORT_TITLE,
  analyzerTest,
} from './utils/analyzer-fixtures';

const test = analyzerTest;
const analyzerRoute = new RegExp(`/report/${ANALYZER_REPORT_CODE}/summary$`);

function addResponsiveAssertions(name: string, viewport: { width: number; height: number }): void {
  test.describe(name, () => {
    test.use({ viewport });

    test('reaches the populated Analyzer route without horizontal overflow', async ({
      analyzerPage,
    }) => {
      await expect(analyzerPage).toHaveURL(analyzerRoute);
      await expect(
        analyzerPage.getByRole('heading', { name: ANALYZER_REPORT_TITLE }),
      ).toBeVisible();
      await expect(
        analyzerPage.getByRole('rowheader', { name: 'E2E Player', exact: true }),
      ).toBeVisible();
      await expect(analyzerPage.getByText('Damage Breakdown', { exact: true })).toBeVisible();

      const dimensions = await analyzerPage.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));
      expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    });

    test('keeps populated summary sections visible at this breakpoint', async ({
      analyzerPage,
    }) => {
      await expect(
        analyzerPage.getByRole('heading', { name: 'Damage Breakdown', exact: true }),
      ).toBeVisible();
      await expect(
        analyzerPage.getByRole('heading', { name: 'Death Analysis', exact: true }),
      ).toBeVisible();
      await expect(analyzerPage.getByText('Flawless Performance!', { exact: true })).toBeVisible();
      await expect(analyzerPage.locator('.MuiSkeleton-root')).toHaveCount(0);
    });
  });
}

addResponsiveAssertions('Responsive Analyzer summary — Pixel 5', {
  width: devices['Pixel 5'].viewport.width,
  height: devices['Pixel 5'].viewport.height,
});
addResponsiveAssertions('Responsive Analyzer summary — iPhone 12', {
  width: devices['iPhone 12'].viewport.width,
  height: devices['iPhone 12'].viewport.height,
});
addResponsiveAssertions('Responsive Analyzer summary — iPad Pro 11', {
  width: devices['iPad Pro 11'].viewport.width,
  height: devices['iPad Pro 11'].viewport.height,
});
addResponsiveAssertions('Responsive Analyzer summary — desktop', { width: 1280, height: 720 });
