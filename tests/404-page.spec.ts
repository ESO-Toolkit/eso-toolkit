import { test, expect, type Page } from '@playwright/test';

const expectNotFoundPage = async (page: Page): Promise<void> => {
  await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Page Not Found', exact: true })).toBeVisible();
};

test.describe('404 Not Found Page', () => {
  test('should display 404 page for invalid route', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expectNotFoundPage(page);
    await expect(page.getByText(/The page you're looking for doesn't exist/i)).toBeVisible();
  });

  test('should display navigation buttons', async ({ page }) => {
    await page.goto('/invalid-route');
    await expectNotFoundPage(page);
    await expect(page.getByRole('button', { name: 'Go Home', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go Back', exact: true })).toBeVisible();
  });

  test('should navigate to home page when "Go Home" button is clicked', async ({ page }) => {
    await page.goto('/invalid-route');
    await expectNotFoundPage(page);
    await page.getByRole('button', { name: 'Go Home', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('should navigate back when "Go Back" button is clicked', async ({ page }) => {
    await page.goto('/calculator');
    await expect(page).toHaveURL(/\/calculator(?:\/)?(?:[?#].*)?$/);
    await page.goto('/invalid-route');
    await expectNotFoundPage(page);
    await page.getByRole('button', { name: 'Go Back', exact: true }).click();
    await expect(page).toHaveURL(/\/calculator/);
  });

  test('should expose current help destinations', async ({ page }) => {
    await page.goto('/does-not-exist');
    await expectNotFoundPage(page);
    const discussionsLink = page.getByRole('link', { name: 'GitHub Discussions', exact: true });
    const documentationLink = page.getByRole('link', { name: 'documentation', exact: true });
    await expect(discussionsLink).toHaveAttribute(
      'href',
      'https://github.com/ESO-Toolkit/eso-toolkit/discussions',
    );
    await expect(documentationLink).toHaveAttribute(
      'href',
      'https://github.com/ESO-Toolkit/eso-toolkit#readme',
    );
    await expect(discussionsLink).toHaveAttribute('target', '_blank');
    await expect(documentationLink).toHaveAttribute('target', '_blank');
  });

  test('should handle deeply nested invalid routes', async ({ page }) => {
    await page.goto('/some/deeply/nested/invalid/route');
    await expectNotFoundPage(page);
  });
});
