import { expect } from '@playwright/test';

import {
  ANALYZER_REPORT_CODE,
  ANALYZER_REPORT_TITLE,
  ANALYZER_SUMMARY_ROUTE,
  analyzerTest,
} from './utils/analyzer-fixtures';

const test = analyzerTest;

test.describe('Analyzer report summary', () => {
  test('renders populated summary data on the current history route', async ({ analyzerPage }) => {
    await expect(analyzerPage).toHaveURL(new RegExp(`/report/${ANALYZER_REPORT_CODE}/summary$`));
    await expect(analyzerPage.getByRole('heading', { name: ANALYZER_REPORT_TITLE })).toBeVisible();
    await expect(analyzerPage.getByText('1 Fights', { exact: true })).toBeVisible();
    await expect(
      analyzerPage.getByRole('rowheader', { name: 'E2E Player', exact: true }),
    ).toBeVisible();
    await expect(analyzerPage.getByText('Flawless Performance!', { exact: true })).toBeVisible();
    await expect(analyzerPage.locator('.MuiSkeleton-root')).toHaveCount(0);
  });

  test('keeps summary navigation on the current report route', async ({ analyzerPage }) => {
    await expect(analyzerPage.getByRole('button', { name: 'Summary', exact: true })).toBeVisible();
    await analyzerPage.getByRole('button', { name: 'Fights', exact: true }).click();
    await expect(analyzerPage).toHaveURL(new RegExp(`/report/${ANALYZER_REPORT_CODE}$`));

    await analyzerPage.goto(ANALYZER_SUMMARY_ROUTE);
    await expect(analyzerPage).toHaveURL(new RegExp(`/report/${ANALYZER_REPORT_CODE}/summary$`));
    await expect(analyzerPage.getByText('Damage Breakdown', { exact: true })).toBeVisible();
  });
});

test.describe('Analyzer summary sections', () => {
  test('shows non-empty damage and death states', async ({ analyzerPage }) => {
    await expect(
      analyzerPage.getByRole('heading', { name: 'Damage Breakdown', exact: true }),
    ).toBeVisible();
    await expect(
      analyzerPage.getByRole('heading', { name: 'Top Damage Dealers', exact: true }),
    ).toBeVisible();
    await expect(
      analyzerPage.getByRole('rowheader', { name: 'E2E Player', exact: true }),
    ).toBeVisible();
    await expect(
      analyzerPage.getByRole('heading', { name: 'Death Analysis', exact: true }),
    ).toBeVisible();
    await expect(analyzerPage.getByText('Flawless Performance!', { exact: true })).toBeVisible();
  });
});
