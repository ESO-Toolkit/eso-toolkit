import { expect, test } from '@playwright/test';

const BUNDLED_SAMPLE_REPORT_URL =
  /\/report\/(?:F4f2bMwWtgVKxjB9|YArFDbq7BdhwL691)(?:[?#]|$)/;
const BUNDLED_SAMPLE_REPORT_TITLE = /^(?:DSR Day 34 Reef Resets\?\?|FAST VSE HM)\s*$/;
const LOGIN_URL = /\/login(?:[?#]|$)/;

test.describe('Utility pages', () => {
  test('renders the banned account state and recovery action', async ({ page }) => {
    await page.goto('/banned');

    await expect(page).toHaveURL(/\/banned(?:[?#]|$)/);
    await expect(page.getByRole('heading', { name: 'Account Banned' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Return to Home' })).toBeEnabled();
  });

  test('redirects an unauthenticated Who Am I request to login', async ({ page }) => {
    await page.goto('/whoami');

    await expect(page).toHaveURL(LOGIN_URL);
    await expect(page.getByRole('heading', { name: 'ESO Toolkit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect to ESO Logs' })).toBeEnabled();
  });

  test('renders the calculation documentation', async ({ page }) => {
    await page.goto('/docs/calculations');

    await expect(page).toHaveURL(/\/docs\/calculations(?:[?#]|$)/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Calculation Knowledge Base' }),
    ).toBeVisible();
    await expect(page.getByRole('region', { name: 'Calculation reference table' })).toBeVisible();
  });

  test('redirects the sample route to a populated bundled report', async ({ page }) => {
    await page.goto('/sample-report');

    await expect(page).toHaveURL(BUNDLED_SAMPLE_REPORT_URL);
    await expect(page.getByRole('heading', { name: BUNDLED_SAMPLE_REPORT_TITLE })).toBeVisible();

    const reportZoneName = page.url().includes('F4f2bMwWtgVKxjB9')
      ? 'Dreadsail Reef Veteran HM'
      : "Sanity's Edge Veteran HM";
    await expect(page.getByRole('heading', { level: 6, name: reportZoneName })).toBeVisible();
    await expect(page.getByRole('button', { name: /#\d+.*(?:KILL|%)/ }).first()).toBeVisible();
    await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
  });

  test('redirects the legacy logs route to an explicit login state', async ({ page }) => {
    await page.goto('/logs');

    await expect(page).toHaveURL(LOGIN_URL);
    await expect(page.getByRole('heading', { name: 'ESO Toolkit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect to ESO Logs' })).toBeEnabled();
  });

  test('preserves browser back navigation across the legacy logs redirect', async ({ page }) => {
    await page.goto('/docs/calculations');
    const docsUrl = page.url();

    await page.goto('/logs');
    await expect(page).toHaveURL(LOGIN_URL);
    await page.goBack();

    await expect(page).toHaveURL(docsUrl);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Calculation Knowledge Base' }),
    ).toBeVisible();
  });
});
