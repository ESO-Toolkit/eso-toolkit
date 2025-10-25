import { test, expect } from '@playwright/test';

test.describe('404 Not Found Page', () => {
  test('should display 404 page for invalid route', async ({ page }) => {
    // Navigate to an invalid route
    await page.goto('/#/this-route-does-not-exist');

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');

    // Check that the 404 page is displayed
    await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();

    // Check that helpful text is displayed
    await expect(
      page.getByText(/The page you're looking for doesn't exist/i),
    ).toBeVisible();
  });

  test('should display navigation buttons', async ({ page }) => {
    await page.goto('/#/invalid-route');
    await page.waitForLoadState('networkidle');

    // Check that both buttons are visible
    await expect(page.getByRole('button', { name: /go home/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /go back/i })).toBeVisible();
  });

  test('should navigate to home page when "Go Home" button is clicked', async ({ page }) => {
    await page.goto('/#/invalid-route');
    await page.waitForLoadState('networkidle');

    // Click the "Go Home" button
    await page.getByRole('button', { name: /go home/i }).click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Verify we're on the home page
    await expect(page).toHaveURL(/\/#\/$/);
  });

  test('should navigate back when "Go Back" button is clicked', async ({ page }) => {
    // First navigate to a valid page
    await page.goto('/#/calculator');
    await page.waitForLoadState('networkidle');

    // Then navigate to an invalid route
    await page.goto('/#/invalid-route');
    await page.waitForLoadState('networkidle');

    // Verify we're on the 404 page
    await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();

    // Click the "Go Back" button
    await page.getByRole('button', { name: /go back/i }).click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Verify we're back on the calculator page
    await expect(page).toHaveURL(/\/#\/calculator/);
  });

  test('should display help text', async ({ page }) => {
    await page.goto('/#/does-not-exist');
    await page.waitForLoadState('networkidle');

    // Check for help text
    await expect(
      page.getByText(/Need help\? Contact support or check the documentation\./i),
    ).toBeVisible();
  });

  test('should handle deeply nested invalid routes', async ({ page }) => {
    await page.goto('/#/some/deeply/nested/invalid/route');
    await page.waitForLoadState('networkidle');

    // Verify 404 page is shown
    await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
  });
});
